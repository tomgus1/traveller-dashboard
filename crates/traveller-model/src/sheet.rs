//! The `character_sheets` document: everything on a character sheet beyond
//! name and characteristics.
//!
//! Fields follow the official character sheets and the Core Rulebook. Money
//! is whole Credits (`i64`); masses are kilograms.

use serde::{Deserialize, Serialize};
use traveller_rules::Credits;

/// The current document version. Bump it, and handle older versions on
/// load, when a change can't be expressed with defaults.
pub const VERSION: u32 = 1;

/// A character's full sheet.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(default)]
pub struct CharacterSheet {
    /// Document version; see [`VERSION`].
    pub version: u32,
    /// Who they are.
    pub identity: Identity,
    /// Trained skills (and level-0 ones).
    pub skills: Vec<Skill>,
    /// Weapons carried or owned.
    pub weapons: Vec<Weapon>,
    /// Spare ammunition.
    pub ammo: Vec<Ammo>,
    /// Armour owned; `worn` marks what's on.
    pub armour: Vec<Armour>,
    /// Everything else carried or owned.
    pub gear: Vec<Item>,
    /// Money.
    pub finances: Finances,
    /// Contacts, allies, rivals and enemies.
    pub people: Vec<Person>,
    /// Career terms, in order.
    pub career: Vec<Term>,
    /// Cybernetic or genetic augments.
    pub augments: Vec<Augment>,
    /// Skills being studied.
    pub training: Vec<Training>,
    /// Psionic strength and talents, if tested (optional rule).
    pub psionics: Option<Psionics>,
    /// Accumulated radiation; it never goes away (Core p.81).
    pub rads: u32,
    /// Lasting injuries and conditions.
    pub injuries: String,
    /// Player's notes.
    pub notes: String,
}

impl Default for CharacterSheet {
    fn default() -> Self {
        Self {
            version: VERSION,
            identity: Identity::default(),
            skills: Vec::new(),
            weapons: Vec::new(),
            ammo: Vec::new(),
            armour: Vec::new(),
            gear: Vec::new(),
            finances: Finances::default(),
            people: Vec::new(),
            career: Vec::new(),
            augments: Vec::new(),
            training: Vec::new(),
            psionics: None,
            rads: 0,
            injuries: String::new(),
            notes: String::new(),
        }
    }
}

impl CharacterSheet {
    /// Kilograms carried: gear, weapons and worn armour.
    pub fn carried_kg(&self) -> f64 {
        let gear: f64 = self
            .gear
            .iter()
            .map(|i| i.kg.unwrap_or(0.0) * f64::from(i.quantity))
            .sum();
        let weapons: f64 = self.weapons.iter().filter_map(|w| w.kg).sum();
        let armour: f64 = self
            .armour
            .iter()
            .filter(|a| a.worn)
            .filter_map(|a| a.kg)
            .sum();
        gear + weapons + armour
    }

    /// Armour currently worn.
    pub fn worn_armour(&self) -> impl Iterator<Item = &Armour> {
        self.armour.iter().filter(|a| a.worn)
    }

    /// A skill's level, if the character has it.
    pub fn skill_level(&self, name: &str) -> Option<i32> {
        self.skills
            .iter()
            .filter(|s| s.name.eq_ignore_ascii_case(name))
            .map(|s| s.level)
            .max()
    }
}

/// Personal details from the sheet's Personal Data block.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(default)]
#[allow(missing_docs)]
pub struct Identity {
    pub species: String,
    pub gender: String,
    pub age: Option<u32>,
    pub homeworld: String,
    pub citizenship: String,
    /// Background skills origin, e.g. "Space habitat".
    pub background: String,
    /// Pre-career education, e.g. "Merchant Academy, graduated".
    pub education: String,
}

/// A skill, with its speciality in the name: "Pilot (spacecraft)".
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(default)]
pub struct Skill {
    /// Name and speciality.
    pub name: String,
    /// Level; 0 is trained without a bonus (Core p.58).
    pub level: i32,
}

/// A weapon.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, Default)]
#[serde(default)]
#[allow(missing_docs)]
pub struct Weapon {
    pub name: String,
    pub tl: Option<u8>,
    /// Range in metres, or "Melee".
    pub range: String,
    /// Damage dice, e.g. "3D-3".
    pub damage: String,
    pub kg: Option<f64>,
    /// Rounds per magazine; none for melee weapons.
    pub magazine: Option<u32>,
    /// Rounds left in the loaded magazine.
    pub rounds: Option<u32>,
    /// Full spare magazines.
    pub spare_magazines: u32,
    /// e.g. "AP 5, Auto 3".
    pub traits: String,
    /// Purchase cost in Credits.
    pub cost: Option<i64>,
    pub notes: String,
}

impl Weapon {
    /// Fires one round. Returns false if the magazine is empty.
    pub fn fire(&mut self) -> bool {
        match self.rounds {
            Some(n) if n > 0 => {
                self.rounds = Some(n - 1);
                true
            }
            _ => false,
        }
    }

    /// Swaps in a spare magazine. Returns false if there's none.
    pub fn reload(&mut self) -> bool {
        match self.magazine {
            Some(capacity) if self.spare_magazines > 0 => {
                self.spare_magazines -= 1;
                self.rounds = Some(capacity);
                true
            }
            _ => false,
        }
    }
}

/// Loose ammunition.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(default)]
#[allow(missing_docs)]
pub struct Ammo {
    pub name: String,
    pub rounds: u32,
    pub capacity: Option<u32>,
    /// Which weapon it fits.
    pub weapon: String,
    pub notes: String,
}

/// Armour.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, Default)]
#[serde(default)]
#[allow(missing_docs)]
pub struct Armour {
    pub name: String,
    pub protection: i32,
    /// Radiation protection.
    pub rad: Option<i32>,
    pub tl: Option<u8>,
    pub kg: Option<f64>,
    pub cost: Option<i64>,
    /// Being worn now.
    pub worn: bool,
    /// e.g. required skill, options fitted.
    pub notes: String,
}

/// A piece of gear.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(default)]
#[allow(missing_docs)]
pub struct Item {
    pub name: String,
    pub tl: Option<u8>,
    pub quantity: u32,
    /// Each.
    pub kg: Option<f64>,
    /// Each, in Credits.
    pub cost: Option<i64>,
    pub notes: String,
}

impl Default for Item {
    fn default() -> Self {
        Self {
            name: String::new(),
            tl: None,
            quantity: 1,
            kg: None,
            cost: None,
            notes: String::new(),
        }
    }
}

/// Money, from the sheet's Financial Data block.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(default)]
pub struct Finances {
    /// Cash on hand.
    pub cash: i64,
    /// Pension per year.
    pub pension: i64,
    /// Debts owed.
    pub debt: i64,
    /// Living cost per month.
    pub living_cost: i64,
    /// Transactions, newest last.
    pub ledger: Vec<LedgerEntry>,
}

impl Finances {
    /// Records a transaction and updates cash on hand.
    pub fn record(
        &mut self,
        date: impl Into<String>,
        description: impl Into<String>,
        amount: Credits,
    ) {
        self.cash += amount.0;
        self.ledger.push(LedgerEntry {
            date: date.into(),
            description: description.into(),
            amount: amount.0,
        });
    }
}

/// One transaction.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(default)]
pub struct LedgerEntry {
    /// Imperial ("105-1105") or calendar date, as entered.
    pub date: String,
    /// What it was for.
    pub description: String,
    /// Credits; negative for spending.
    pub amount: i64,
}

/// How someone relates to the character (Core p.48–49, Connections).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(rename_all = "snake_case")]
#[allow(missing_docs)]
pub enum Relation {
    #[default]
    Contact,
    Ally,
    Rival,
    Enemy,
}

/// A contact, ally, rival or enemy.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(default)]
#[allow(missing_docs)]
pub struct Person {
    pub relation: Relation,
    pub name: String,
    pub location: String,
    pub relationship: String,
}

/// One career term.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(default)]
#[allow(missing_docs)]
pub struct Term {
    pub career: String,
    pub assignment: String,
    pub rank: String,
    pub events: String,
    /// Skills, benefits and connections gained.
    pub gained: String,
}

/// An augment.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(default)]
#[allow(missing_docs)]
pub struct Augment {
    pub name: String,
    pub tl: Option<u8>,
    pub effect: String,
}

/// Study towards a skill.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(default)]
#[allow(missing_docs)]
pub struct Training {
    pub skill: String,
    pub weeks_done: u32,
    pub weeks_needed: u32,
}

/// Psionic strength and talents (optional rule).
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(default)]
pub struct Psionics {
    /// PSI maximum.
    pub psi: i32,
    /// PSI after use; none when full.
    pub current: Option<i32>,
    /// Talents, as skills.
    pub talents: Vec<Skill>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn empty_and_partial_documents_load() {
        let empty: CharacterSheet = serde_json::from_str("{}").unwrap();
        assert_eq!(empty, CharacterSheet::default());

        let partial: CharacterSheet =
            serde_json::from_value(serde_json::json!({"skills": [{"name": "Pilot", "level": 2}]}))
                .unwrap();
        assert_eq!(partial.skill_level("pilot"), Some(2));
        assert_eq!(partial.version, VERSION);
    }

    #[test]
    fn round_trips_through_json() {
        let mut sheet = CharacterSheet::default();
        sheet.identity.homeworld = "Halcyon".into();
        sheet.people.push(Person {
            relation: Relation::Rival,
            name: "Captain Venn".into(),
            ..Person::default()
        });
        sheet
            .finances
            .record("104-1105", "Sold spices", Credits(62_000));

        let json = serde_json::to_value(&sheet).unwrap();
        assert_eq!(json["people"][0]["relation"], "rival");
        let back: CharacterSheet = serde_json::from_value(json).unwrap();
        assert_eq!(back, sheet);
        assert_eq!(back.finances.cash, 62_000);
    }

    /// Checks sheets produced by database/06-character-sheets.sql's backfill
    /// load into these types. Point `TD_SHEETS_JSONL` at a file with one
    /// `data` value per line (`COPY (SELECT data FROM character_sheets) TO
    /// STDOUT`); skipped when unset.
    #[test]
    fn backfilled_sheets_load() {
        let Ok(path) = std::env::var("TD_SHEETS_JSONL") else {
            return;
        };
        let text = std::fs::read_to_string(path).unwrap();
        let mut count = 0;
        for line in text.lines().filter(|l| !l.trim().is_empty()) {
            let sheet: CharacterSheet = serde_json::from_str(line)
                .unwrap_or_else(|e| panic!("backfilled sheet didn't load: {e}\n{line}"));
            assert_eq!(sheet.version, VERSION);
            count += 1;
        }
        assert!(count > 0, "no sheets in file");
    }

    #[test]
    fn fire_and_reload() {
        let mut gun = Weapon {
            magazine: Some(15),
            rounds: Some(1),
            spare_magazines: 1,
            ..Weapon::default()
        };
        assert!(gun.fire());
        assert!(!gun.fire(), "empty");
        assert!(gun.reload());
        assert_eq!((gun.rounds, gun.spare_magazines), (Some(15), 0));
        assert!(!gun.reload(), "no spares");

        let mut knife = Weapon::default();
        assert!(!knife.fire() && !knife.reload());
    }

    #[test]
    fn carried_mass_counts_worn_armour_only() {
        let mut sheet = CharacterSheet::default();
        sheet.gear.push(Item {
            name: "Magazine".into(),
            quantity: 2,
            kg: Some(0.5),
            ..Item::default()
        });
        sheet.weapons.push(Weapon {
            kg: Some(1.0),
            ..Weapon::default()
        });
        sheet.armour.push(Armour {
            kg: Some(2.0),
            worn: true,
            ..Armour::default()
        });
        sheet.armour.push(Armour {
            kg: Some(10.0),
            worn: false,
            ..Armour::default()
        });
        assert!((sheet.carried_kg() - 4.0).abs() < f64::EPSILON);
    }
}
