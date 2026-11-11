//! Skills and specialities, and a Traveller's level in one (Core p.58,
//! skill list p.64 onwards).
//!
//! A skill is written as the book does: "Admin", or with a speciality in
//! brackets, "Gun Combat (slug)".

/// A skill in the Core Rulebook.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct SkillDef {
    /// e.g. "Gun Combat".
    pub name: &'static str,
    /// Its specialities; for open-ended ones (Language, Profession,
    /// Science), common examples.
    pub specialities: &'static [&'static str],
    /// Specialities are open-ended: any may be written in.
    pub open: bool,
}

const fn skill(name: &'static str) -> SkillDef {
    SkillDef {
        name,
        specialities: &[],
        open: false,
    }
}

const fn with(name: &'static str, specialities: &'static [&'static str]) -> SkillDef {
    SkillDef {
        name,
        specialities,
        open: false,
    }
}

const fn open(name: &'static str, examples: &'static [&'static str]) -> SkillDef {
    SkillDef {
        name,
        specialities: examples,
        open: true,
    }
}

/// The skill used for Jack-of-all-Trades.
pub const JACK_OF_ALL_TRADES: &str = "Jack-of-all-Trades";

/// Every skill in the Core Rulebook (Update 2022), in the book's order.
pub const SKILLS: &[SkillDef] = &[
    skill("Admin"),
    skill("Advocate"),
    with("Animals", &["handling", "training", "veterinary"]),
    with(
        "Art",
        &[
            "holography",
            "instrument",
            "performer",
            "visual media",
            "write",
        ],
    ),
    skill("Astrogation"),
    with("Athletics", &["dexterity", "endurance", "strength"]),
    skill("Broker"),
    skill("Carouse"),
    skill("Deception"),
    skill("Diplomat"),
    with("Drive", &["hovercraft", "mole", "track", "walker", "wheel"]),
    with(
        "Electronics",
        &["comms", "computers", "remote ops", "sensors"],
    ),
    with("Engineer", &["j-drive", "life support", "m-drive", "power"]),
    skill("Explosives"),
    with(
        "Flyer",
        &["airship", "grav", "ornithopter", "rotor", "wing"],
    ),
    skill("Gambler"),
    with("Gunner", &["capital", "ortillery", "screen", "turret"]),
    with("Gun Combat", &["archaic", "energy", "slug"]),
    with("Heavy Weapons", &["artillery", "portable", "vehicle"]),
    skill("Investigate"),
    skill(JACK_OF_ALL_TRADES),
    open(
        "Language",
        &["Anglic", "Aslan", "Gvegh", "Oynprith", "Vilani", "Zdetl"],
    ),
    skill("Leadership"),
    skill("Mechanic"),
    skill("Medic"),
    with("Melee", &["blade", "bludgeon", "natural", "unarmed"]),
    skill("Navigation"),
    skill("Persuade"),
    with("Pilot", &["capital ships", "small craft", "spacecraft"]),
    open(
        "Profession",
        &[
            "belter",
            "biologicals",
            "civil engineering",
            "construction",
            "hydroponics",
            "polymers",
        ],
    ),
    skill("Recon"),
    open(
        "Science",
        &[
            "archaeology",
            "astronomy",
            "biology",
            "chemistry",
            "cosmology",
            "cybernetics",
            "economics",
            "genetics",
            "history",
            "linguistics",
            "philosophy",
            "physics",
            "planetology",
            "psionicology",
            "psychology",
            "robotics",
            "sophontology",
            "xenology",
        ],
    ),
    with(
        "Seafarer",
        &["ocean ships", "personal", "sail", "submarine"],
    ),
    skill("Stealth"),
    skill("Steward"),
    skill("Streetwise"),
    skill("Survival"),
    with("Tactics", &["military", "naval"]),
    skill("Vacc Suit"),
];

/// Every skill and speciality as written on a sheet: "Admin", "Animals",
/// "Animals (handling)", … for searching.
pub fn all_names() -> Vec<String> {
    let mut names = Vec::new();
    for s in SKILLS {
        names.push(s.name.to_string());
        for spec in s.specialities {
            names.push(format!("{} ({spec})", s.name));
        }
    }
    names
}

/// Splits "Gun Combat (slug)" into ("Gun Combat", Some("slug")).
pub fn split(name: &str) -> (&str, Option<&str>) {
    let name = name.trim();
    match name.split_once('(') {
        Some((base, rest)) => {
            let spec = rest.trim_end().trim_end_matches(')').trim();
            (base.trim(), (!spec.is_empty()).then_some(spec))
        }
        None => (name, None),
    }
}

/// A Traveller's level for a check with `wanted` ("Gun Combat (energy)",
/// or just "Gun Combat"), from the skills they have as (name, level)
/// (Core p.58):
///
/// - the speciality itself, if they have it;
/// - otherwise 0 if they have the skill at all (the skill at 0, or any of
///   its specialities): Gun Combat (slug) 2 still fires an energy weapon
///   at level 0;
/// - otherwise `None`: untrained.
///
/// Asking for the skill without a speciality gives their best level in it.
/// Names compare without regard to case.
pub fn level_for<'a>(
    skills: impl IntoIterator<Item = (&'a str, i32)>,
    wanted: &str,
) -> Option<i32> {
    let (base, spec) = split(wanted);
    let mut found: Option<i32> = None;
    for (name, level) in skills {
        let (have_base, have_spec) = split(name);
        if !have_base.eq_ignore_ascii_case(base) {
            continue;
        }
        let level = match (spec, have_spec) {
            // Exactly the speciality, or the best of any when none asked.
            (Some(w), Some(h)) if w.eq_ignore_ascii_case(h) => level,
            (None, _) => level,
            // The skill, or another speciality: level 0.
            _ => 0,
        };
        found = Some(found.map_or(level, |f| f.max(level)));
    }
    found
}

/// The DM a skill gives a check (Core p.58–59): its level, or untrained
/// DM-3, which Jack-of-all-Trades reduces by its level (to no better than
/// DM+0).
pub fn skill_dm<'a>(skills: impl IntoIterator<Item = (&'a str, i32)> + Clone, wanted: &str) -> i32 {
    if let Some(level) = level_for(skills.clone(), wanted) {
        level.max(0)
    } else {
        let jack = level_for(skills, JACK_OF_ALL_TRADES).unwrap_or(0).max(0);
        (-3 + jack).min(0)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn have(list: &[(&'static str, i32)]) -> Vec<(&'static str, i32)> {
        list.to_vec()
    }

    #[test]
    fn splits_names() {
        assert_eq!(split("Gun Combat (slug)"), ("Gun Combat", Some("slug")));
        assert_eq!(split(" Admin "), ("Admin", None));
        assert_eq!(split("Pilot ()"), ("Pilot", None));
    }

    #[test]
    fn engineer_example() {
        // Core p.58: Engineer (j-drive) 1 and Engineer (power plant) 2;
        // j-drive checks DM+1, power DM+2, other Engineer checks DM+0.
        let skills = have(&[("Engineer (j-drive)", 1), ("Engineer (power)", 2)]);
        assert_eq!(skill_dm(skills.iter().copied(), "Engineer (j-drive)"), 1);
        assert_eq!(skill_dm(skills.iter().copied(), "Engineer (power)"), 2);
        assert_eq!(skill_dm(skills.iter().copied(), "Engineer (m-drive)"), 0);
        assert_eq!(
            level_for(skills.iter().copied(), "Engineer"),
            Some(2),
            "best"
        );
    }

    #[test]
    fn one_speciality_gives_the_others_at_zero() {
        let skills = have(&[("Gun Combat (slug)", 2)]);
        assert_eq!(
            level_for(skills.iter().copied(), "gun combat (Energy)"),
            Some(0)
        );
        assert_eq!(
            level_for(skills.iter().copied(), "Gun Combat (slug)"),
            Some(2)
        );
        let base_only = have(&[("Gun Combat", 0)]);
        assert_eq!(
            level_for(base_only.iter().copied(), "Gun Combat (slug)"),
            Some(0)
        );
    }

    #[test]
    fn untrained_and_jack_of_all_trades() {
        let none = have(&[("Admin", 1)]);
        assert_eq!(level_for(none.iter().copied(), "Pilot (spacecraft)"), None);
        assert_eq!(skill_dm(none.iter().copied(), "Pilot (spacecraft)"), -3);
        let jack = have(&[(JACK_OF_ALL_TRADES, 2)]);
        assert_eq!(skill_dm(jack.iter().copied(), "Pilot"), -1);
        let jack3 = have(&[(JACK_OF_ALL_TRADES, 3)]);
        assert_eq!(skill_dm(jack3.iter().copied(), "Pilot"), 0, "never a bonus");
    }

    #[test]
    fn names_for_searching() {
        let names = all_names();
        assert!(names.contains(&"Gun Combat (slug)".to_string()));
        assert!(names.contains(&"Vacc Suit".to_string()));
        assert_eq!(
            names.len(),
            SKILLS.len() + SKILLS.iter().map(|s| s.specialities.len()).sum::<usize>()
        );
    }
}
