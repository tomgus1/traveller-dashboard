//! Bonuses from augments to characteristics and skills.
//!
//! The values entered on a sheet are the Traveller's own; augments add on
//! top, so taking an augment out takes its bonus with it. Everything shown
//! and rolled uses the effective values: own plus bonuses.

use serde::{Deserialize, Serialize};
use traveller_rules::Characteristic;

use crate::{CharacterSheet, Characteristics};

/// One bonus: "STR +2" or "Athletics (dexterity) +1".
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(default)]
pub struct Bonus {
    /// A characteristic ("STR") or a skill ("Athletics (dexterity)").
    pub target: String,
    /// Added to the characteristic or skill level (may be negative).
    pub amount: i32,
}

impl Bonus {
    /// The characteristic it raises, if it's one.
    pub fn characteristic(&self) -> Option<Characteristic> {
        characteristic_named(&self.target)
    }
}

fn characteristic_named(name: &str) -> Option<Characteristic> {
    Characteristic::ALL
        .into_iter()
        .find(|c| c.abbreviation().eq_ignore_ascii_case(name.trim()))
}

/// One "target +n" or "+n to target" phrase.
fn parse_one(phrase: &str) -> Option<Bonus> {
    let phrase = phrase.trim().trim_end_matches('.');
    let number = |s: &str| -> Option<i32> {
        let s = s.trim().replace('−', "-");
        let s = s.strip_prefix('+').unwrap_or(&s).to_string();
        s.parse().ok()
    };
    // "+2 to INT"
    if let Some((amount, target)) = phrase.split_once(" to ") {
        let amount = number(amount)?;
        return Some(Bonus {
            target: target.trim().to_string(),
            amount,
        })
        .filter(|b| !b.target.is_empty());
    }
    // "STR +2", "Athletics (dexterity) -1"
    let (target, amount) = phrase.rsplit_once(' ')?;
    let amount = number(amount)?;
    let target = target.trim();
    (!target.is_empty()).then(|| Bonus {
        target: target.to_string(),
        amount,
    })
}

/// Reads bonuses as written in the form: "STR +2, Athletics (dexterity)
/// +1". Blank is none.
///
/// # Errors
///
/// A message naming the part that isn't "target +n".
pub fn parse_list(text: &str) -> Result<Vec<Bonus>, String> {
    text.split(',')
        .map(str::trim)
        .filter(|p| !p.is_empty())
        .map(|p| {
            parse_one(p).ok_or_else(|| {
                format!("\u{201c}{p}\u{201d} isn't a bonus. Write e.g. STR +2, Athletics (dexterity) +1.")
            })
        })
        .collect()
}

/// Writes bonuses as the form shows them: "STR +2, Athletics +1".
pub fn format_list(bonuses: &[Bonus]) -> String {
    bonuses
        .iter()
        .map(|b| format!("{} {:+}", b.target, b.amount))
        .collect::<Vec<_>>()
        .join(", ")
}

/// The characteristic bonuses a catalogue augment's effect states plainly
/// ("STR +1, DEX +1, END -1", "+2 to INT"). A choice ("+1 to STR, DEX or
/// END") or anything else gives none: the player fills those in.
pub fn from_effect(effect: &str) -> Vec<Bonus> {
    if effect.contains(" or ") {
        return Vec::new();
    }
    effect
        .split([',', ';'])
        .filter_map(parse_one)
        .filter(|b| b.characteristic().is_some())
        .map(|b| Bonus {
            target: b.target.trim().to_uppercase(),
            ..b
        })
        .collect()
}

/// A skill as it counts: the Traveller's own level and any augment bonus.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct EffectiveSkill {
    /// As written on the sheet (or in the augment's bonus).
    pub name: String,
    /// Their own level; `None` for a skill only an augment gives.
    pub own: Option<i32>,
    /// From augments.
    pub bonus: i32,
}

impl EffectiveSkill {
    /// The level used for checks.
    pub fn level(&self) -> i32 {
        self.own.unwrap_or(0) + self.bonus
    }
}

impl CharacterSheet {
    /// Every augment bonus.
    pub fn bonuses(&self) -> impl Iterator<Item = &Bonus> {
        self.augments.iter().flat_map(|a| a.bonuses.iter())
    }

    /// The total augment bonus to one characteristic.
    pub fn characteristic_bonus(&self, c: Characteristic) -> i32 {
        self.bonuses()
            .filter(|b| b.characteristic() == Some(c))
            .map(|b| b.amount)
            .sum()
    }

    /// Characteristics with augment bonuses added to both the maximum and
    /// the current value (damage still comes off the Traveller's own).
    pub fn effective(&self, own: &Characteristics) -> Characteristics {
        let mut out = *own;
        for c in Characteristic::ALL {
            let bonus = self.characteristic_bonus(c);
            if bonus == 0 {
                continue;
            }
            let stat = match c {
                Characteristic::Str => &mut out.str,
                Characteristic::Dex => &mut out.dex,
                Characteristic::End => &mut out.end,
                Characteristic::Int => &mut out.int,
                Characteristic::Edu => &mut out.edu,
                Characteristic::Soc => &mut out.soc,
            };
            stat.value += bonus;
            stat.current = stat.current.map(|v| v + bonus);
        }
        out
    }

    /// Skills with augment bonuses: the sheet's skills in order, then any
    /// only an augment gives. A bonus applies to the skill written the same
    /// way (ignoring case).
    pub fn effective_skills(&self) -> Vec<EffectiveSkill> {
        let mut out: Vec<EffectiveSkill> = self
            .skills
            .iter()
            .map(|s| EffectiveSkill {
                name: s.name.clone(),
                own: Some(s.level),
                bonus: 0,
            })
            .collect();
        for b in self.bonuses().filter(|b| b.characteristic().is_none()) {
            match out
                .iter_mut()
                .find(|s| s.name.eq_ignore_ascii_case(b.target.trim()))
            {
                Some(s) => s.bonus += b.amount,
                None => out.push(EffectiveSkill {
                    name: b.target.trim().to_string(),
                    own: None,
                    bonus: b.amount,
                }),
            }
        }
        out
    }
}

/// A skill as the sheet lists it.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ListedSkill {
    /// The skill, with any augment bonus.
    pub skill: EffectiveSkill,
    /// Not written on the sheet: another speciality of a skill they have,
    /// at 0 (Core p.58).
    pub implied: bool,
}

impl CharacterSheet {
    /// Every skill the Traveller can use, A to Z: the sheet's skills (with
    /// augment bonuses), plus the other specialities of each at 0. A skill
    /// written at 0 without a speciality ("Drive 0") is shown as its
    /// specialities instead.
    pub fn listed_skills(&self) -> Vec<ListedSkill> {
        let effective = self.effective_skills();
        let names: Vec<&str> = effective.iter().map(|s| s.name.as_str()).collect();
        let implied = traveller_rules::skills::implied_at_zero(&names);
        let mut out: Vec<ListedSkill> = effective
            .iter()
            .filter(|s| {
                !(traveller_rules::skills::has_fixed_specialities(&s.name)
                    && s.own == Some(0)
                    && s.bonus == 0)
            })
            .map(|s| ListedSkill {
                skill: s.clone(),
                implied: false,
            })
            .chain(implied.into_iter().map(|name| ListedSkill {
                skill: EffectiveSkill {
                    name,
                    own: Some(0),
                    bonus: 0,
                },
                implied: true,
            }))
            .collect();
        out.sort_by_key(|l| l.skill.name.to_lowercase());
        out
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::sheet::{Augment, Skill};

    fn bonus(target: &str, amount: i32) -> Bonus {
        Bonus {
            target: target.into(),
            amount,
        }
    }

    #[test]
    fn reads_and_writes_the_form_text() {
        let list = parse_list("STR +2, Athletics (dexterity) +1,  INT -1 ").unwrap();
        assert_eq!(
            list,
            [
                bonus("STR", 2),
                bonus("Athletics (dexterity)", 1),
                bonus("INT", -1)
            ]
        );
        assert_eq!(
            format_list(&list),
            "STR +2, Athletics (dexterity) +1, INT -1"
        );
        assert_eq!(parse_list("").unwrap(), []);
        assert!(parse_list("lots of strength").is_err());
    }

    #[test]
    fn plain_effects_become_bonuses() {
        assert_eq!(from_effect("STR +1"), [bonus("STR", 1)]);
        assert_eq!(from_effect("+2 to INT"), [bonus("INT", 2)]);
        assert_eq!(
            from_effect("Adaptation to microgravity (see above), STR +1, DEX +1, END -1"),
            [bonus("STR", 1), bonus("DEX", 1), bonus("END", -1)]
        );
        assert_eq!(
            from_effect("STR +1, DEX +1, movement +3 metres"),
            [bonus("STR", 1), bonus("DEX", 1)]
        );
        assert_eq!(from_effect("+1 to STR, DEX or END"), [], "a choice");
        assert_eq!(from_effect("Skill DM+1"), []);
        assert_eq!(from_effect("Protection +1"), []);
    }

    fn sheet() -> CharacterSheet {
        CharacterSheet {
            skills: vec![
                Skill {
                    name: "Athletics (dexterity)".into(),
                    level: 1,
                },
                Skill {
                    name: "Admin".into(),
                    level: 0,
                },
            ],
            augments: vec![Augment {
                name: "Muscular Bridging".into(),
                bonuses: vec![
                    bonus("STR", 1),
                    bonus("DEX", 1),
                    bonus("athletics (dexterity)", 1),
                    bonus("Recon", 1),
                ],
                ..Augment::default()
            }],
            ..CharacterSheet::default()
        }
    }

    #[test]
    fn characteristics_get_bonuses_on_top() {
        let mut own = Characteristics::default();
        own.str.value = 7;
        own.str.current = Some(5);
        own.dex.value = 8;
        let s = sheet();
        let eff = s.effective(&own);
        assert_eq!((eff.str.value, eff.str.current), (8, Some(6)));
        assert_eq!((eff.dex.value, eff.dex.current), (9, None));
        assert_eq!(own.str.value, 7, "own values untouched");

        // Taking the augment out takes the bonus with it.
        let mut without = s;
        without.augments.clear();
        assert_eq!(without.effective(&own), own);
    }

    #[test]
    fn listed_skills_are_alphabetical_with_implied_specialities() {
        let sheet = CharacterSheet {
            skills: vec![
                Skill {
                    name: "Broker".into(),
                    level: 3,
                },
                Skill {
                    name: "Athletics (dexterity)".into(),
                    level: 1,
                },
                Skill {
                    name: "Drive".into(),
                    level: 0,
                },
            ],
            ..CharacterSheet::default()
        };
        let listed: Vec<(String, i32, bool)> = sheet
            .listed_skills()
            .into_iter()
            .map(|l| (l.skill.name.clone(), l.skill.level(), l.implied))
            .collect();
        let names: Vec<&str> = listed.iter().map(|(n, _, _)| n.as_str()).collect();
        assert_eq!(
            names,
            [
                "Athletics (dexterity)",
                "Athletics (endurance)",
                "Athletics (strength)",
                "Broker",
                "Drive (hovercraft)",
                "Drive (mole)",
                "Drive (track)",
                "Drive (walker)",
                "Drive (wheel)",
            ]
        );
        assert_eq!(listed[0], ("Athletics (dexterity)".into(), 1, false));
        assert_eq!(listed[1], ("Athletics (endurance)".into(), 0, true));
    }

    #[test]
    fn skills_get_bonuses_and_augment_only_skills() {
        let skills = sheet().effective_skills();
        assert_eq!(skills[0].level(), 2, "Athletics (dexterity) 1 + 1");
        assert_eq!(skills[1].level(), 0);
        assert_eq!(
            skills[2],
            EffectiveSkill {
                name: "Recon".into(),
                own: None,
                bonus: 1
            }
        );
    }
}
