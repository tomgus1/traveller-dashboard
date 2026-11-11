//! The equipment catalogue: items and their stats, extracted from the
//! rulebooks the group owns.
//!
//! The data is copyrighted, so catalogue files live in the git-ignored
//! `data/catalogue/` and are loaded into the database privately; only this
//! shape is public.

use std::collections::BTreeMap;

use serde::{Deserialize, Serialize};

use crate::campaign_state::CargoLot;
use crate::sheet::{Armour, Augment, Item, Weapon};

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
    /// Speculative trade goods: `cost` is the base price per ton.
    TradeGood,
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
    /// Trade stats, for trade goods.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub trade: Option<TradeStats>,
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

/// Trade goods stats, as printed.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Default)]
#[allow(missing_docs)]
pub struct TradeStats {
    /// The D66 roll, e.g. "11".
    pub d66: String,
    /// Trade codes of worlds that sell it, e.g. "Industrial, High Tech".
    pub availability: String,
    /// Tons a supplier has, e.g. "2D x 10".
    pub tons: String,
    /// e.g. "Industrial +2, High Tech +3".
    pub purchase_dm: String,
    pub sale_dm: String,
    pub examples: String,
}

/// The books a catalogue can come from: id and short name.
pub const BOOKS: &[(&str, &str)] = &[("core-2022", "Core"), ("csc-2023", "CSC")];

/// A weapon's range as the sheet shows it: the CSC prints bare metres
/// ("250"), the Core "250m"; both become "250m". Anything else ("Melee")
/// is kept.
pub fn range_text(range: &str) -> String {
    let range = range.trim();
    if !range.is_empty() && range.chars().all(|c| c.is_ascii_digit() || c == ',') {
        format!("{range}m")
    } else {
        range.to_string()
    }
}

/// A book's short name for references, e.g. "CSC" for "csc-2023".
pub fn book_short_name(book: &str) -> &str {
    match book.split('-').next().unwrap_or(book) {
        "csc" => "CSC",
        "core" => "Core",
        _ => book,
    }
}

/// The leading signed whole number: "+10 (+16 vs. lasers)" is 10.
fn leading_int(text: &str) -> Option<i32> {
    let text = text.trim();
    let (sign, rest) = match text.strip_prefix('-').or_else(|| text.strip_prefix('−')) {
        Some(rest) => (-1, rest),
        None => (1, text.strip_prefix('+').unwrap_or(text)),
    };
    let digits: String = rest.chars().take_while(char::is_ascii_digit).collect();
    digits.parse::<i32>().ok().map(|n| sign * n)
}

/// Joins non-empty parts with ". ".
fn sentence(parts: &[&str]) -> String {
    parts
        .iter()
        .map(|p| p.trim())
        .filter(|p| !p.is_empty())
        .collect::<Vec<_>>()
        .join(". ")
}

impl CatalogueItem {
    /// Where it's from, e.g. "CSC p.143".
    pub fn reference(&self) -> String {
        format!("{} p.{}", book_short_name(&self.book), self.page)
    }

    /// As a weapon on a sheet, loaded, with no spare magazines yet, and
    /// its likely skill.
    pub fn to_weapon(&self) -> Weapon {
        let stats = self.weapon.clone().unwrap_or_default();
        let range = range_text(&stats.range);
        Weapon {
            skill: crate::sheet::guess_weapon_skill(&self.name, &range),
            name: self.name.clone(),
            tl: self.tl,
            range,
            damage: stats.damage,
            kg: self.kg,
            magazine: stats.magazine,
            magazine_cost: stats.magazine_cost,
            rounds: stats.magazine,
            spare_magazines: 0,
            traits: stats.traits.join(", "),
            cost: self.cost,
            notes: self.reference(),
        }
    }

    /// As armour on a sheet, not yet worn. Protection that isn't a plain
    /// number ("+10 (+16 vs. lasers…)") and the required skill go in the
    /// notes.
    pub fn to_armour(&self) -> Armour {
        let stats = self.armour.clone().unwrap_or_default();
        let protection = leading_int(&stats.protection).unwrap_or(0);
        let plain = stats.protection.trim().trim_start_matches('+') == protection.to_string();
        let skill = if stats.required_skill.eq_ignore_ascii_case("none") {
            String::new()
        } else {
            format!("Requires {}", stats.required_skill)
        };
        let extra = if plain {
            String::new()
        } else {
            format!("Protection {}", stats.protection)
        };
        Armour {
            name: self.name.clone(),
            protection,
            rad: stats.rad,
            tl: self.tl,
            kg: self.kg,
            cost: self.cost,
            worn: false,
            notes: sentence(&[
                &extra,
                if stats.required_skill.is_empty() {
                    ""
                } else {
                    &skill
                },
                &self.reference(),
            ]),
        }
    }

    /// As a piece of gear on a sheet, one of it.
    pub fn to_item(&self) -> Item {
        Item {
            name: self.name.clone(),
            tl: self.tl,
            quantity: 1,
            kg: self.kg,
            cost: self.cost,
            notes: sentence(&[&self.effect, &self.reference()]),
        }
    }

    /// As an augment on a sheet, with any characteristic bonuses its
    /// effect states plainly ("STR +1").
    pub fn to_augment(&self) -> Augment {
        Augment {
            name: self.name.clone(),
            tl: self.tl,
            effect: sentence(&[&self.effect, &self.reference()]),
            bonuses: crate::bonuses::from_effect(&self.effect),
        }
    }

    /// As a lot of cargo, with the trade DMs in the notes. Tons and the
    /// price actually paid depend on the deal, so they're left for the
    /// player.
    pub fn to_cargo(&self) -> CargoLot {
        let stats = self.trade.clone().unwrap_or_default();
        let base = self
            .cost
            .map(|c| format!("Base {}/ton", traveller_rules::Credits(c)))
            .unwrap_or_default();
        let purchase = if stats.purchase_dm.is_empty() {
            String::new()
        } else {
            format!("Purchase DM {}", stats.purchase_dm)
        };
        let sale = if stats.sale_dm.is_empty() {
            String::new()
        } else {
            format!("Sale DM {}", stats.sale_dm)
        };
        CargoLot {
            goods: self.name.clone(),
            notes: sentence(&[&base, &purchase, &sale, &self.reference()]),
            ..CargoLot::default()
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn item(kind: ItemKind, name: &str) -> CatalogueItem {
        CatalogueItem {
            id: format!("csc-2023/{name}"),
            book: "csc-2023".into(),
            page: 143,
            section: String::new(),
            kind,
            name: name.into(),
            tl: Some(10),
            cost: Some(1500),
            kg: Some(2.0),
            weapon: None,
            armour: None,
            trade: None,
            effect: String::new(),
            columns: BTreeMap::new(),
        }
    }

    #[test]
    fn trade_goods_become_cargo() {
        // Invented goods: the book's table isn't in this repository.
        let mut goods = item(ItemKind::TradeGood, "Glowmoss");
        goods.book = "core-2022".into();
        goods.page = 300;
        goods.tl = None;
        goods.cost = Some(1234);
        goods.trade = Some(TradeStats {
            purchase_dm: "Garden +1".into(),
            sale_dm: "Poor +4".into(),
            ..TradeStats::default()
        });
        let lot = goods.to_cargo();
        assert_eq!((lot.goods.as_str(), lot.tons, lot.paid), ("Glowmoss", 0, 0));
        assert_eq!(
            lot.notes,
            "Base Cr1,234/ton. Purchase DM Garden +1. Sale DM Poor +4. Core p.300"
        );
    }

    #[test]
    fn weapons_arrive_loaded() {
        let mut gauss = item(ItemKind::Weapon, "Gauss Rifle");
        gauss.weapon = Some(WeaponStats {
            range: "600".into(),
            damage: "4D".into(),
            magazine: Some(80),
            magazine_cost: Some(80),
            traits: vec!["AP 5".into(), "Auto 3".into()],
        });
        let w = gauss.to_weapon();
        assert_eq!(
            (w.magazine, w.rounds, w.spare_magazines),
            (Some(80), Some(80), 0)
        );
        assert_eq!(w.traits, "AP 5, Auto 3");
        assert_eq!(
            (w.damage.as_str(), w.cost, w.notes.as_str()),
            ("4D", Some(1500), "CSC p.143")
        );
    }

    #[test]
    fn armour_protection_and_skill() {
        let mut vacc = item(ItemKind::Armour, "Vacc Suit");
        vacc.armour = Some(ArmourStats {
            protection: "+8".into(),
            rad: Some(60),
            required_skill: "Vacc Suit 0".into(),
        });
        let a = vacc.to_armour();
        assert_eq!((a.protection, a.rad, a.worn), (8, Some(60), false));
        assert_eq!(a.notes, "Requires Vacc Suit 0. CSC p.143");

        let mut ceramic = item(ItemKind::Armour, "Ceramic Carapace");
        ceramic.armour = Some(ArmourStats {
            protection: "+10 (+16 vs. lasers)".into(),
            rad: None,
            required_skill: "None".into(),
        });
        let a = ceramic.to_armour();
        assert_eq!(a.protection, 10);
        assert_eq!(a.notes, "Protection +10 (+16 vs. lasers). CSC p.143");
    }

    #[test]
    fn gear_and_augments_carry_the_effect() {
        let mut mask = item(ItemKind::Gear, "Filter Mask (Basic)");
        mask.effect = "Protection against smoke".into();
        mask.book = "core-2022".into();
        let i = mask.to_item();
        assert_eq!(
            (i.quantity, i.notes.as_str()),
            (1, "Protection against smoke. Core p.143")
        );
        let aug = item(ItemKind::Augment, "Neural Comm").to_augment();
        assert_eq!(aug.effect, "CSC p.143");
    }

    #[test]
    fn leading_numbers() {
        assert_eq!(leading_int("+10 (+16 vs. lasers)"), Some(10));
        assert_eq!(leading_int("-1"), Some(-1));
        assert_eq!(leading_int("—"), None);
        assert_eq!(range_text("250"), "250m");
        assert_eq!(range_text("250m"), "250m");
        assert_eq!(range_text("Melee"), "Melee");
        assert_eq!(range_text(""), "");
        assert_eq!(
            book_short_name("mystery-1999"),
            "mystery-1999",
            "unknown: as is"
        );
    }

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
            trade: None,
            effect: String::new(),
            columns: BTreeMap::new(),
        };
        let json = serde_json::to_value(&item).unwrap();
        assert_eq!(json["kind"], "weapon");
        assert!(json.get("armour").is_none(), "absent stats are omitted");
        assert_eq!(serde_json::from_value::<CatalogueItem>(json).unwrap(), item);
    }
}
