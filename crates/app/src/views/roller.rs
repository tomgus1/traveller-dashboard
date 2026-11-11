//! Rolling a check (Core p.59–61): 2D, plus a characteristic DM and a skill
//! DM, against a difficulty. Uses the character's values as they count,
//! augment bonuses included. Results show on this screen only.

use dioxus::prelude::*;
use traveller_model::Characteristics;
use traveller_model::sheet::Weapon;
use traveller_rules::combat::DamageDice;
use traveller_rules::dice::{self, Dice, Modifier};
use traveller_rules::skills;
use traveller_rules::tasks::{self, Difficulty, Outcome, TaskResult};
use traveller_rules::{Characteristic, dm};

use super::editor::{today, use_editor};
use traveller_rules::Credits;

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
pub struct Check {
    /// e.g. "Attack: Revolver"; none for a plain check.
    title: Option<String>,
    /// e.g. "Gun Combat (slug) + DEX".
    what: String,
    difficulty: &'static str,
    dice: Vec<u8>,
    modifier: Modifier,
    /// Each DM that applied, e.g. ("DEX", 1), ("Gun Combat (slug)", 2).
    dms: Vec<(String, i32)>,
    result: TaskResult,
    /// For a hit: the damage roll, in words.
    damage: Option<String>,
}

/// The rolls made on this page (newest first), shared by the check roller
/// and the weapons' Attack buttons.
#[derive(Clone, Copy, PartialEq)]
pub struct RollLog(Signal<Vec<Check>>);

impl RollLog {
    /// Starts the page's log.
    pub fn provide() -> Self {
        use_context_provider(|| Self(Signal::new(Vec::new())))
    }

    fn push(mut self, check: Check) {
        let mut log = self.0.write();
        log.insert(0, check);
        log.truncate(5);
    }
}

fn throw(count: usize) -> Vec<u8> {
    let mut d = BrowserDice;
    (0..count).map(|_| d.d6()).collect()
}

/// An attack with a weapon (Core p.72–77): its skill, with DEX (melee: the
/// better of STR and DEX), against Average (8+). A hit rolls damage: the
/// weapon's dice plus the Effect, plus the STR DM in melee, before the
/// target's armour. `damage_dice` supplies the damage dice.
pub fn attack(
    weapon: &Weapon,
    stats: &Characteristics,
    skill_levels: &[(String, i32)],
    thrown: Vec<u8>,
    mut damage_dice: impl FnMut(usize) -> Vec<u8>,
) -> Check {
    let skill = weapon.attack_skill();
    let skill_dm = skills::skill_dm(skill_levels.iter().map(|(n, l)| (n.as_str(), *l)), &skill);
    let score = |c: Characteristic| stats.get(c).current();
    let characteristic =
        if weapon.is_melee() && dm(score(Characteristic::Str)) > dm(score(Characteristic::Dex)) {
            Characteristic::Str
        } else {
            Characteristic::Dex
        };
    let mut c = check(
        thrown,
        Modifier::None,
        Some((characteristic, score(characteristic))),
        Some((&skill, skill_dm)),
        0,
        Difficulty::Average,
    );
    c.title = Some(format!("Attack: {}", weapon.name));
    if c.result.outcome.is_success() {
        c.damage = Some(match DamageDice::parse(&weapon.damage) {
            Some(dd) => {
                let rolled = damage_dice(usize::from(dd.dice));
                let base = dd.total(&rolled);
                let str_dm = if weapon.is_melee() {
                    dm(score(Characteristic::Str))
                } else {
                    0
                };
                let total = (base + c.result.effect + str_dm).max(0);
                let mut text = format!(
                    "Damage {}: rolled {} = {base}, Effect {}",
                    weapon.damage.trim(),
                    rolled
                        .iter()
                        .map(u8::to_string)
                        .collect::<Vec<_>>()
                        .join(", "),
                    signed(c.result.effect)
                );
                if str_dm != 0 {
                    text.push_str(" · STR ");
                    text.push_str(&signed(str_dm));
                }
                text.push_str(" = ");
                text.push_str(&total.to_string());
                text.push_str(" before armour");
                if let Some(ap) = weapon
                    .traits
                    .split(',')
                    .map(str::trim)
                    .find(|t| t.starts_with("AP"))
                {
                    text.push_str(" (");
                    text.push_str(ap);
                    text.push(')');
                }
                text
            }
            None => format!(
                "Damage: {} (roll as the referee says)",
                weapon.damage.trim()
            ),
        });
    }
    c
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
        title: None,
        damage: None,
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
    let log: RollLog = use_context();
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
        log.push(check(
            throw(count),
            modifier(),
            c,
            skill_part,
            other_dm,
            difficulty(),
        ));
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
            RollLogView {}
        }
    }
}

/// The last few rolls, newest first.
#[component]
fn RollLogView() -> Element {
    let log: RollLog = use_context();
    let entries = log.0.read();
    if entries.is_empty() {
        return rsx! {};
    }
    rsx! {
        ol { class: "roll-log", aria_live: "polite",
            for (i, c) in entries.iter().enumerate() {
                li { key: "{entries.len() - i}",
                    class: if i == 0 { "latest" } else { "" },
                    p { class: if c.result.outcome.is_success() { "roll-outcome ok" } else { "roll-outcome fail" },
                        if let Some(title) = &c.title {
                            "{title}: "
                        }
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
                    if let Some(damage) = &c.damage {
                        p { class: "small strong", "{damage}" }
                    }
                }
            }
        }
    }
}

/// The character's weapons as compact rows with Attack and Reload, for the
/// table (no sideways scrolling on a phone). Attack fires a round from a
/// magazine weapon and rolls; a hit rolls damage.
#[component]
pub fn WeaponRows(
    weapons: Vec<Weapon>,
    stats: Characteristics,
    skills: Vec<(String, i32)>,
) -> Element {
    let editor = use_editor();
    let log: RollLog = use_context();
    let busy = (editor.saving)();
    if weapons.is_empty() {
        return rsx! { p { class: "muted", "None." } };
    }
    rsx! {
        ul { class: "weapon-rows",
            for (i, w) in weapons.into_iter().enumerate() {
                {
                    let empty = w.magazine.is_some() && w.rounds.unwrap_or(0) == 0;
                    let can_reload = w.magazine.is_some() && w.spare_magazines > 0;
                    // A spare magazine can be bought when its price is known.
                    let mag_cost = w.magazine.and(w.magazine_cost);
                    let cash = editor.sheet.read().finances.cash;
                    let details = weapon_line(&w);
                    let skills = skills.clone();
                    let name = w.name.clone();
                    let name_for_mag = w.name.clone();
                    rsx! {
                        li { key: "{i}",
                            div { class: "weapon-text",
                                strong { "{w.name}" }
                                span { class: "muted small", "{details}" }
                            }
                            div { class: "row-actions",
                                button { class: "mini", r#type: "button", disabled: empty || busy,
                                    aria_label: "Attack with {name}",
                                    onclick: move |_| {
                                        if w.magazine.is_some() {
                                            editor.update_sheet("Fired one round.", move |s| {
                                                if let Some(x) = s.weapons.get_mut(i) {
                                                    x.fire();
                                                }
                                            });
                                        }
                                        log.push(attack(&w, &stats, &skills, throw(2), throw));
                                    },
                                    if empty { "Empty" } else { "Attack" }
                                }
                                if w.magazine.is_some() {
                                    button { class: "mini outline", r#type: "button", disabled: !can_reload || busy,
                                        aria_label: "Reload {name}",
                                        onclick: move |_| editor.update_sheet("Reloaded.", move |s| {
                                            if let Some(x) = s.weapons.get_mut(i) {
                                                x.reload();
                                            }
                                        }),
                                        "Reload"
                                    }
                                }
                                if let Some(cost) = mag_cost {
                                    button { class: "mini outline", r#type: "button", disabled: cash < cost || busy,
                                        aria_label: "Buy a spare magazine for {name} for {Credits(cost)} from cash",
                                        title: if cash < cost { "Not enough cash" } else { "" },
                                        onclick: move |_| {
                                            let what = format!("Spare magazine: {name_for_mag}");
                                            editor.update_sheet("Bought a spare magazine.", move |s| {
                                                if s.finances.cash < cost {
                                                    return;
                                                }
                                                if let Some(x) = s.weapons.get_mut(i) {
                                                    x.spare_magazines += 1;
                                                    s.finances.record(today(), what, Credits(-cost));
                                                }
                                            });
                                        },
                                        "+ Mag {Credits(cost)}"
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

/// A weapon's stats in one line: "Gun Combat (slug) · 10m · 3D-3 · 6/6
/// rounds, 2 spare · AP 5".
fn weapon_line(w: &Weapon) -> String {
    let mut parts = vec![w.attack_skill()];
    for text in [&w.range, &w.damage] {
        if !text.trim().is_empty() {
            parts.push(text.trim().to_string());
        }
    }
    if let Some(capacity) = w.magazine {
        let mut ammo = format!("{}/{capacity} rounds", w.rounds.unwrap_or(0));
        if w.spare_magazines > 0 {
            ammo.push_str(", ");
            ammo.push_str(&w.spare_magazines.to_string());
            ammo.push_str(" spare");
        }
        parts.push(ammo);
    }
    if !w.traits.trim().is_empty() {
        parts.push(w.traits.trim().to_string());
    }
    parts.join(" · ")
}

#[cfg(test)]
mod tests {
    use super::*;

    fn stats(str_: i32, dex: i32) -> Characteristics {
        let mut s = Characteristics::default();
        s.str.value = str_;
        s.dex.value = dex;
        s
    }

    #[test]
    fn ranged_attacks_use_dex_and_add_effect_to_damage() {
        let gun = Weapon {
            name: "Autopistol".into(),
            range: "10m".into(),
            damage: "3D-3".into(),
            traits: "AP 2".into(),
            ..Weapon::default()
        };
        // DEX 9 (DM+1), Gun Combat (slug) 1: rolls 4+4 = 8 + 2 = 10, Effect +2.
        let skills = vec![("Gun Combat (slug)".to_string(), 1)];
        let c = attack(&gun, &stats(12, 9), &skills, vec![4, 4], |_| vec![5, 3, 2]);
        assert_eq!(c.what, "Gun Combat (slug) + DEX");
        assert_eq!(c.result.effect, 2);
        // 5+3+2-3 = 7, + Effect 2 = 9; ranged adds no STR.
        assert_eq!(
            c.damage.as_deref(),
            Some("Damage 3D-3: rolled 5, 3, 2 = 7, Effect +2 = 9 before armour (AP 2)")
        );
    }

    #[test]
    fn melee_uses_the_better_of_str_and_dex_and_adds_str_to_damage() {
        let blade = Weapon {
            name: "Cutlass".into(),
            range: "Melee".into(),
            damage: "3D".into(),
            ..Weapon::default()
        };
        // STR 12 (DM+2) beats DEX 7 (DM+0); untrained Melee: DM-3.
        let c = attack(&blade, &stats(12, 7), &[], vec![6, 5], |_| vec![1, 1, 1]);
        assert_eq!(c.what, "Melee (blade) + STR");
        assert_eq!(c.result.total, 11 + 2 - 3);
        assert_eq!(
            c.damage.as_deref(),
            Some("Damage 3D: rolled 1, 1, 1 = 3, Effect +2 · STR +2 = 7 before armour")
        );
    }

    #[test]
    fn misses_roll_no_damage() {
        let gun = Weapon {
            name: "Revolver".into(),
            damage: "3D-3".into(),
            ..Weapon::default()
        };
        let c = attack(&gun, &stats(7, 7), &[], vec![1, 2], |_| {
            panic!("no damage roll on a miss")
        });
        assert!(!c.result.outcome.is_success());
        assert_eq!(c.damage, None);
    }

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
