//! The equipment catalogue: items and their stats, extracted from the
//! rulebooks the group owns.
//!
//! The data is copyrighted, so catalogue files live in the git-ignored
//! `data/catalogue/` and are loaded into the database privately; only this
//! shape is public.

use std::collections::BTreeMap;

use serde::{Deserialize, Serialize};

/// A catalogue file: every item extracted from one book.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Catalogue {
    /// e.g. "csc-2023".
    pub book: String,
    /// e.g. "Central Supply Catalogue (Update 2023)".
    pub title: String,
    /// The items, in book order.
    pub items: Vec<CatalogueItem>,
}

/// What an item is, which decides the stats it carries.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
#[allow(missing_docs)]
pub enum ItemKind {
    Weapon,
    Armour,
    Augment,
    Software,
    Gear,
}

/// One item.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct CatalogueItem {
    /// Stable id: book, name and TL, e.g. "csc-2023/autopistol-tl6".
    pub id: String,
    /// Which book, e.g. "csc-2023".
    pub book: String,
    /// Printed page number.
    pub page: u32,
    /// The book's chapter, e.g. "Weaponry".
    pub section: String,
    /// What it is.
    pub kind: ItemKind,
    /// As printed, with any variant in brackets.
    pub name: String,
    /// Tech level.
    pub tl: Option<u8>,
    /// Credits.
    pub cost: Option<i64>,
    /// Kilograms.
    pub kg: Option<f64>,
    /// Weapon stats, for weapons.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub weapon: Option<WeaponStats>,
    /// Armour stats, for armour.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub armour: Option<ArmourStats>,
    /// The table's effect or improvement column, where there is one.
    #[serde(default, skip_serializing_if = "String::is_empty")]
    pub effect: String,
    /// Every cell as printed, by column heading, so nothing is lost if a
    /// value doesn't parse.
    pub columns: BTreeMap<String, String>,
}

/// Weapon stats.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Default)]
#[allow(missing_docs)]
pub struct WeaponStats {
    /// Metres, "Melee", or as printed.
    pub range: String,
    /// e.g. "3D-3".
    pub damage: String,
    pub magazine: Option<u32>,
    /// Credits for a spare magazine (or power pack).
    pub magazine_cost: Option<i64>,
    /// Each trait separately, e.g. `AP 5` and `Auto 3`.
    pub traits: Vec<String>,
}

/// Armour stats.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Default)]
#[allow(missing_docs)]
pub struct ArmourStats {
    /// As printed, e.g. "+5" or "+10 (vs. lasers only)".
    pub protection: String,
    pub rad: Option<i32>,
    /// e.g. "Vacc Suit 1".
    pub required_skill: String,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn round_trips_through_json() {
        let item = CatalogueItem {
            id: "test/autopistol-tl6".into(),
            book: "test".into(),
            page: 1,
            section: "Weaponry".into(),
            kind: ItemKind::Weapon,
            name: "Autopistol".into(),
            tl: Some(6),
            cost: Some(200),
            kg: Some(1.0),
            weapon: Some(WeaponStats {
                range: "10".into(),
                damage: "3D-3".into(),
                magazine: Some(15),
                magazine_cost: Some(10),
                traits: vec![],
            }),
            armour: None,
            effect: String::new(),
            columns: BTreeMap::new(),
        };
        let json = serde_json::to_value(&item).unwrap();
        assert_eq!(json["kind"], "weapon");
        assert!(json.get("armour").is_none(), "absent stats are omitted");
        assert_eq!(serde_json::from_value::<CatalogueItem>(json).unwrap(), item);
    }
}
