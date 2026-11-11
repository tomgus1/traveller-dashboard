//! Rolling a check (Core p.59–61): 2D, plus a characteristic DM and a skill
//! DM, against a difficulty. Uses the character's values as they count,
//! augment bonuses included. Results show on this screen only.

use dioxus::prelude::*;
use traveller_model::Characteristics;
use traveller_rules::dice::{self, Dice, Modifier};
use traveller_rules::skills;
use traveller_rules::tasks::{self, Difficulty, Outcome, TaskResult};
use traveller_rules::{Characteristic, dm};

/// Real dice, from the browser's random numbers.
struct BrowserDice;

impl Dice for BrowserDice {
    #[allow(clippy::cast_possible_truncation, clippy::cast_sign_loss)] // random() is in [0, 1)
    fn d6(&mut self) -> u8 {
        (js_sys::Math::random() * 6.0) as u8 + 1
    }
}

const DIFFICULTIES: [(Difficulty, &str); 8] = [
    (Difficulty::Simple, "Simple (2+)"),
    (Difficulty::Easy, "Easy (4+)"),
    (Difficulty::Routine, "Routine (6+)"),
    (Difficulty::Average, "Average (8+)"),
    (Difficulty::Difficult, "Difficult (10+)"),
    (Difficulty::VeryDifficult, "Very Difficult (12+)"),
    (Difficulty::Formidable, "Formidable (14+)"),
    (Difficulty::Impossible, "Impossible (16+)"),
];

/// One check: what was rolled for, and how it went.
#[derive(Debug, Clone, PartialEq)]
struct Check {
    /// e.g. "Gun Combat (slug) + DEX".
    what: String,
    difficulty: &'static str,
    dice: Vec<u8>,
    modifier: Modifier,
    /// Each DM that applied, e.g. ("DEX", 1), ("Gun Combat (slug)", 2).
    dms: Vec<(String, i32)>,
    result: TaskResult,
}

/// Works out a check from thrown dice (3 for a Boon or Bane).
fn check(
    thrown: Vec<u8>,
    modifier: Modifier,
    characteristic: Option<(Characteristic, i32)>,
    skill: Option<(&str, i32)>,
    other: i32,
    difficulty: Difficulty,
) -> Check {
    let mut dms = Vec::new();
    let mut what = Vec::new();
    if let Some((name, skill_dm)) = skill {
        dms.push((name.to_string(), skill_dm));
        what.push(name.to_string());
    }
    if let Some((c, score)) = characteristic {
        dms.push((c.abbreviation().to_string(), dm(score)));
        what.push(c.abbreviation().to_string());
    }
    if other != 0 {
        dms.push(("Other".to_string(), other));
    }
    let total_dm = dms.iter().map(|(_, v)| v).sum();
    let result = tasks::resolve(dice::total(&thrown, modifier), total_dm, difficulty);
    let label = DIFFICULTIES
        .iter()
        .find(|(d, _)| *d == difficulty)
        .map_or("", |(_, l)| l);
    Check {
        what: if what.is_empty() {
            "2D".into()
        } else {
            what.join(" + ")
        },
        difficulty: label,
        dice: thrown,
        modifier,
        dms,
        result,
    }
}

fn signed(n: i32) -> String {
    if n >= 0 {
        format!("+{n}")
    } else {
        format!("\u{2212}{}", -n)
    }
}

fn outcome_label(o: Outcome) -> &'static str {
    match o {
        Outcome::ExceptionalFailure => "Exceptional failure",
        Outcome::AverageFailure => "Failure",
        Outcome::MarginalFailure => "Marginal failure",
        Outcome::MarginalSuccess => "Marginal success",
        Outcome::AverageSuccess => "Success",
        Outcome::ExceptionalSuccess => "Exceptional success",
    }
}

/// The dice as thrown, marking the one a Boon or Bane drops.
fn dice_text(c: &Check) -> String {
    let kept = dice::total(&c.dice, c.modifier);
    let mut text = c
        .dice
        .iter()
        .map(u8::to_string)
        .collect::<Vec<_>>()
        .join(", ");
    let kept_by = match c.modifier {
        Modifier::None => return text,
        Modifier::Boon => "Boon: best two",
        Modifier::Bane => "Bane: lowest two",
    };
    text.push_str(" (");
    text.push_str(kept_by);
    text.push_str(", ");
    text.push_str(&kept.to_string());
    text.push(')');
    text
}

/// Roll a check with the character's skills and characteristics.
/// `stats` are as they count (augments included); `skills` are (name,
/// level), the same.
#[component]
pub fn TaskRoller(stats: Characteristics, skills: Vec<(String, i32)>) -> Element {
    let mut skill = use_signal(String::new);
    let mut characteristic = use_signal(|| None::<Characteristic>);
    let mut difficulty = use_signal(|| Difficulty::Average);
    let mut other = use_signal(String::new);
    let mut modifier = use_signal(|| Modifier::None);
    let mut history = use_signal(Vec::<Check>::new);
    let mut error = use_signal(|| None::<String>);

    // The player's skills first, then every skill in the book.
    let mut options: Vec<String> = skills.iter().map(|(n, _)| n.clone()).collect();
    for name in skills::all_names() {
        if !options.iter().any(|o| o.eq_ignore_ascii_case(&name)) {
            options.push(name);
        }
    }

    let skills_for_roll = skills.clone();
    let roll = move |evt: FormEvent| {
        evt.prevent_default();
        let other_dm = match other().trim() {
            "" => 0,
            text => match text
                .replace('\u{2212}', "-")
                .trim_start_matches('+')
                .parse::<i32>()
            {
                Ok(n) if (-20..=20).contains(&n) => n,
                _ => {
                    error.set(Some(
                        "Other DM must be a whole number, e.g. -2 or 1.".into(),
                    ));
                    return;
                }
            },
        };
        error.set(None);
        let wanted = skill().trim().to_string();
        let skill_part = (!wanted.is_empty()).then(|| {
            let dm = skills::skill_dm(
                skills_for_roll.iter().map(|(n, l)| (n.as_str(), *l)),
                &wanted,
            );
            (wanted.as_str(), dm)
        });
        let c = characteristic().map(|c| (c, stats.get(c).current()));
        let count = if modifier() == Modifier::None { 2 } else { 3 };
        let mut d = BrowserDice;
        let thrown: Vec<u8> = (0..count).map(|_| d.d6()).collect();
        let result = check(thrown, modifier(), c, skill_part, other_dm, difficulty());
        let mut h = history.write();
        h.insert(0, result);
        h.truncate(5);
    };

    rsx! {
        form { class: "quick-box roller", onsubmit: roll,
            h3 { "Roll a check" }
            p { class: "muted small", "2D + characteristic DM + skill DM against the difficulty (Core p.59\u{2013}61). Augments included." }
            div { class: "roller-grid",
                div { class: "field",
                    label { r#for: "roll-skill", "Skill" }
                    input { id: "roll-skill", r#type: "text", list: "roll-skills", autocomplete: "off",
                        placeholder: "None, or start typing", maxlength: "80",
                        value: "{skill}", oninput: move |e| skill.set(e.value()) }
                    datalist { id: "roll-skills",
                        for o in options.iter() {
                            option { key: "{o}", value: "{o}" }
                        }
                    }
                }
                div { class: "field",
                    label { r#for: "roll-char", "Characteristic" }
                    select { id: "roll-char",
                        onchange: move |e| characteristic.set(
                            Characteristic::ALL.into_iter().find(|c| c.abbreviation() == e.value())),
                        option { value: "", selected: characteristic().is_none(), "None" }
                        for c in Characteristic::ALL {
                            option { key: "{c}", value: "{c.abbreviation()}", selected: characteristic() == Some(c),
                                "{c} ({signed(dm(stats.get(c).current()))})" }
                        }
                    }
                }
                div { class: "field",
                    label { r#for: "roll-diff", "Difficulty" }
                    select { id: "roll-diff",
                        onchange: move |e| {
                            if let Some((d, _)) = DIFFICULTIES.iter().find(|(_, l)| *l == e.value()) {
                                difficulty.set(*d);
                            }
                        },
                        for (d, label) in DIFFICULTIES {
                            option { key: "{label}", value: "{label}", selected: difficulty() == d, "{label}" }
                        }
                    }
                }
                div { class: "field",
                    label { r#for: "roll-dm", "Other DM" }
                    input { id: "roll-dm", r#type: "text", inputmode: "numeric", placeholder: "0",
                        value: "{other}", oninput: move |e| other.set(e.value()) }
                }
                div { class: "field",
                    label { r#for: "roll-boon", "Boon / Bane" }
                    select { id: "roll-boon",
                        onchange: move |e| modifier.set(match e.value().as_str() {
                            "boon" => Modifier::Boon,
                            "bane" => Modifier::Bane,
                            _ => Modifier::None,
                        }),
                        option { value: "none", selected: modifier() == Modifier::None, "Neither" }
                        option { value: "boon", selected: modifier() == Modifier::Boon, "Boon (3D, best two)" }
                        option { value: "bane", selected: modifier() == Modifier::Bane, "Bane (3D, lowest two)" }
                    }
                }
            }
            if let Some(message) = error() {
                p { class: "error", role: "alert", "{message}" }
            }
            button { class: "btn", r#type: "submit", "Roll" }

            if !history.read().is_empty() {
                ol { class: "roll-log", aria_live: "polite",
                    for (i, c) in history.read().iter().enumerate() {
                        li { key: "{i}-{c.result.total}-{c.dice.len()}",
                            class: if i == 0 { "latest" } else { "" },
                            p { class: if c.result.outcome.is_success() { "roll-outcome ok" } else { "roll-outcome fail" },
                                strong { "{outcome_label(c.result.outcome)}" }
                                " · Effect {signed(c.result.effect)}"
                            }
                            p { class: "small",
                                "{c.what}, {c.difficulty}: rolled {dice_text(c)}"
                                for (name, value) in c.dms.iter() {
                                    " · {name} {signed(*value)}"
                                }
                                " = "
                                strong { "{c.result.total}" }
                            }
                        }
                    }
                }
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn a_check_adds_every_dm() {
        // Gun Combat (slug) 2 with DEX 10 (DM+1), Average: rolls 3 and 4.
        let c = check(
            vec![3, 4],
            Modifier::None,
            Some((Characteristic::Dex, 10)),
            Some(("Gun Combat (slug)", 2)),
            -1,
            Difficulty::Average,
        );
        assert_eq!(c.result.total, 7 + 1 + 2 - 1);
        assert_eq!(c.result.effect, 1);
        assert_eq!(c.what, "Gun Combat (slug) + DEX");
        assert_eq!(c.dms.len(), 3);
    }

    #[test]
    fn boons_keep_the_best_two() {
        let c = check(
            vec![1, 6, 5],
            Modifier::Boon,
            None,
            None,
            0,
            Difficulty::Difficult,
        );
        assert_eq!(c.result.total, 11);
        assert_eq!(dice_text(&c), "1, 6, 5 (Boon: best two, 11)");
        assert_eq!(c.what, "2D");
    }
}
