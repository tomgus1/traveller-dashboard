//! Turning raw tables into catalogue items.

use std::collections::{BTreeMap, HashMap};

use traveller_model::catalogue::{ArmourStats, CatalogueItem, ItemKind, WeaponStats};

use crate::tables::RawTable;

/// A book the extractor knows: where its equipment chapters are.
pub struct Book {
    pub id: &'static str,
    pub title: &'static str,
    /// Printed page = PDF page − this.
    pub page_offset: u32,
    /// Printed pages to read.
    pub pages: (u32, u32),
    /// Chapters by first printed page, in order.
    pub sections: &'static [(u32, &'static str)],
}

/// The books, checked against their contents pages.
pub const BOOKS: &[Book] = &[
    Book {
        id: "csc-2023",
        title: "Central Supply Catalogue (Update 2023)",
        page_offset: 1,
        pages: (12, 181),
        sections: &[
            (12, "Armour"),
            (48, "Augments"),
            (62, "Communications"),
            (66, "Computers and Software"),
            (73, "Electronics"),
            (80, "Home Comforts"),
            (88, "Medical Care and Supplies"),
            (97, "Survival Gear"),
            (125, "Tools"),
            (131, "Weaponry"),
            (174, "Weapon Accessories"),
            (176, "Specialised Ammunition"),
        ],
    },
    Book {
        id: "core-2022",
        title: "Core Rulebook (Update 2022)",
        page_offset: 1,
        pages: (97, 135),
        sections: &[(97, "Equipment")],
    },
];

impl Book {
    /// The chapter a printed page is in.
    pub fn section(&self, printed: u32) -> &'static str {
        self.sections
            .iter()
            .rev()
            .find(|(first, _)| *first <= printed)
            .map_or("Other", |(_, name)| name)
    }
}

/// First-column headings that are generic rather than a family name.
const GENERIC: &[&str] = &[
    "WEAPON",
    "WEAPONS",
    "ITEM",
    "ITEMS",
    "ARMOUR",
    "ARMOUR TYPE",
    "TYPE",
    "AUGMENT",
    "AUGMENTS",
    "SENSOR",
    "SENSORS",
    "SOFTWARE",
    "PROGRAM",
    "SURVIVAL GEAR",
    "TOOLKIT",
    "TOOLKITS",
    "AMMUNITION",
    "AMMO",
    "ACCESSORY",
    "DEVICE",
    "DRUG",
    "MODIFICATION",
    "OPTION",
];

/// Whether a first-column heading is generic ("Item", "Weapon") rather
/// than the name of an item family.
pub fn is_generic(label: &str) -> bool {
    GENERIC.iter().any(|g| g.eq_ignore_ascii_case(label))
}

fn is_blank(cell: &str) -> bool {
    matches!(cell.trim(), "" | "—" | "-" | "–")
}

/// The first whole number in a cell.
pub fn first_number(cell: &str) -> Option<u64> {
    let digits: String = cell
        .chars()
        .skip_while(|c| !c.is_ascii_digit())
        .take_while(char::is_ascii_digit)
        .collect();
    digits.parse().ok()
}

/// Credits: "Cr1,500", "Cr1000", "`KCr5`", "`MCr1.5`", "1000". `None` when
/// blank or not a price.
#[allow(clippy::cast_possible_truncation)]
pub fn credits(cell: &str) -> Option<i64> {
    let text = cell.trim().replace(',', "");
    if is_blank(&text) {
        return None;
    }
    let (scale, rest) = if let Some(r) = text.strip_prefix("MCr") {
        (1_000_000.0, r)
    } else if let Some(r) = text.strip_prefix("KCr") {
        (1_000.0, r)
    } else if let Some(r) = text.strip_prefix("Cr") {
        (1.0, r)
    } else {
        (1.0, text.as_str())
    };
    let number: String = rest
        .chars()
        .take_while(|c| c.is_ascii_digit() || *c == '.')
        .collect();
    number
        .parse::<f64>()
        .ok()
        .map(|n| (n * scale).round() as i64)
}

/// Kilograms: "0.5", "2", "1.5kg". `None` when blank or not a number.
pub fn kilograms(cell: &str) -> Option<f64> {
    let number: String = cell
        .trim()
        .chars()
        .take_while(|c| c.is_ascii_digit() || *c == '.')
        .collect();
    number.parse().ok()
}

/// Traits, one per comma. Tick glyphs and dashes from neighbouring columns
/// the header didn't name (the ammunition table's weapon types) are dropped.
fn traits(cell: &str) -> Vec<String> {
    let cleaned: String = cell
        .chars()
        .filter(|c| !('\u{e000}'..='\u{f8ff}').contains(c))
        .collect();
    let cleaned = cleaned.trim_end_matches([' ', '—']);
    if is_blank(cleaned) {
        return Vec::new();
    }
    cleaned
        .split(',')
        .map(|t| t.trim_matches([' ', '—']))
        .filter(|t| !t.is_empty())
        .map(str::to_string)
        .collect()
}

fn slug(text: &str) -> String {
    let mut out = String::new();
    for c in text.chars() {
        if c.is_ascii_alphanumeric() {
            out.push(c.to_ascii_lowercase());
        } else if !out.ends_with('-') {
            out.push('-');
        }
    }
    out.trim_matches('-').to_string()
}

fn kind_of(table: &RawTable) -> ItemKind {
    let first = table.columns[0].label.to_uppercase();
    if table.column("DAMAGE").is_some() || first.starts_with("WEAPON") {
        ItemKind::Weapon
    } else if table.column("PROTECTION").is_some() || first.starts_with("ARMOUR") {
        ItemKind::Armour
    } else if first.starts_with("AUGMENT") {
        ItemKind::Augment
    } else if table.column("BANDWIDTH").is_some() || first == "SOFTWARE" {
        ItemKind::Software
    } else {
        ItemKind::Gear
    }
}

/// Turns tables into items, giving each a unique id.
pub fn items(book: &Book, tables: &[RawTable]) -> Vec<CatalogueItem> {
    let mut seen: HashMap<String, usize> = HashMap::new();
    let mut out = Vec::new();
    for table in tables {
        let printed = table.page.saturating_sub(book.page_offset);
        let family = &table.columns[0].label;
        let generic = is_generic(family);
        let kind = kind_of(table);
        let cell = |row: &[String], label: &str| -> String {
            table
                .column(label)
                .and_then(|i| row.get(i))
                .cloned()
                .unwrap_or_default()
        };

        for row in &table.rows {
            let row_name = row[0].trim();
            let name = if generic || row_name.to_lowercase().contains(&family.to_lowercase()) {
                row_name.to_string()
            } else if row_name.is_empty() {
                family.clone()
            } else {
                format!("{family} ({row_name})")
            };
            if name.is_empty() {
                continue;
            }
            let tl = first_number(&cell(row, "TL")).and_then(|n| u8::try_from(n).ok());
            let kg_cell = if table.column("KG").is_some() {
                cell(row, "KG")
            } else {
                cell(row, "MASS")
            };
            let columns: BTreeMap<String, String> = table
                .columns
                .iter()
                .zip(row)
                .map(|(c, v)| (c.label.clone(), v.clone()))
                .collect();

            let weapon = (kind == ItemKind::Weapon).then(|| WeaponStats {
                range: cell(row, "RANGE"),
                damage: cell(row, "DAMAGE"),
                magazine: first_number(&cell(row, "MAGAZINE")).and_then(|n| u32::try_from(n).ok()),
                magazine_cost: credits(&cell(row, "MAGAZINE COST"))
                    .or_else(|| credits(&cell(row, "PACK COST"))),
                traits: traits(&cell(row, "TRAITS")),
            });
            let armour = (kind == ItemKind::Armour).then(|| ArmourStats {
                protection: cell(row, "PROTECTION"),
                rad: first_number(&cell(row, "RAD")).and_then(|n| i32::try_from(n).ok()),
                required_skill: {
                    let s = cell(row, "REQUIRED SKILL");
                    let s = if s.is_empty() { cell(row, "SKILL") } else { s };
                    if is_blank(&s) { String::new() } else { s }
                },
            });
            let effect = [
                "EFFECT",
                "IMPROVEMENTS",
                "IMPROVEMENT",
                "FEATURES",
                "PROCESSING",
            ]
            .iter()
            .map(|l| cell(row, l))
            .find(|e| !e.is_empty())
            .unwrap_or_default();

            let base = format!(
                "{}/{}{}",
                book.id,
                slug(&name),
                tl.map(|t| format!("-tl{t}")).unwrap_or_default()
            );
            let n = seen.entry(base.clone()).or_insert(0);
            *n += 1;
            let id = if *n == 1 { base } else { format!("{base}-{n}") };

            out.push(CatalogueItem {
                id,
                book: book.id.to_string(),
                page: printed,
                section: book.section(printed).to_string(),
                kind,
                name,
                tl,
                cost: credits(&cell(row, "COST")),
                kg: kilograms(&kg_cell),
                weapon,
                armour,
                effect,
                columns,
            });
        }
    }
    out
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::tables::Column;

    #[test]
    fn parses_prices_and_masses() {
        assert_eq!(credits("Cr1,500"), Some(1500));
        assert_eq!(credits("Cr10"), Some(10));
        assert_eq!(credits("KCr5"), Some(5000));
        assert_eq!(credits("MCr1.5"), Some(1_500_000));
        assert_eq!(credits("—"), None);
        assert_eq!(credits("40"), Some(40));
        assert_eq!(kilograms("0.5"), Some(0.5));
        assert_eq!(kilograms("—"), None);
        assert_eq!(first_number("10–12"), Some(10));
    }

    #[test]
    fn traits_drop_tick_columns() {
        assert_eq!(traits("AP 5, Auto 3"), ["AP 5", "Auto 3"]);
        assert_eq!(traits("Blast 12 — — — \u{f0fc}"), ["Blast 12"]);
        assert_eq!(
            traits("Blast 500, — — — \u{f0fc} Radiation"),
            ["Blast 500", "Radiation"]
        );
        assert_eq!(traits("—"), Vec::<String>::new());
    }

    fn table(columns: &[&str], rows: &[&[&str]]) -> RawTable {
        RawTable {
            page: 141,
            columns: columns
                .iter()
                .map(|l| Column {
                    label: (*l).to_string(),
                    x0: 0.0,
                })
                .collect(),
            rows: rows
                .iter()
                .map(|r| r.iter().map(|c| (*c).to_string()).collect())
                .collect(),
        }
    }

    #[test]
    fn weapons_get_weapon_stats_and_unique_ids() {
        let t = table(
            &[
                "WEAPON",
                "TL",
                "RANGE",
                "DAMAGE",
                "KG",
                "COST",
                "MAGAZINE",
                "MAGAZINE COST",
                "TRAITS",
            ],
            &[
                &[
                    "Accelerator Rifle",
                    "9",
                    "250",
                    "3D",
                    "2",
                    "Cr900",
                    "15",
                    "Cr30",
                    "Zero-G",
                ],
                &[
                    "Accelerator Rifle",
                    "11",
                    "400",
                    "3D",
                    "2",
                    "Cr1500",
                    "20",
                    "Cr40",
                    "Zero-G",
                ],
                &[
                    "Gauss Rifle",
                    "12",
                    "600",
                    "4D",
                    "4",
                    "Cr1500",
                    "80",
                    "Cr80",
                    "AP 5, Auto 3, Scope",
                ],
            ],
        );
        let items = items(&BOOKS[0], &[t]);
        assert_eq!(items[0].id, "csc-2023/accelerator-rifle-tl9");
        assert_eq!(items[1].id, "csc-2023/accelerator-rifle-tl11");
        assert_eq!(items[0].section, "Weaponry");
        assert_eq!(items[0].page, 140);
        let w = items[2].weapon.as_ref().unwrap();
        assert_eq!(w.traits, ["AP 5", "Auto 3", "Scope"]);
        assert_eq!((w.magazine, w.magazine_cost), (Some(80), Some(80)));
        assert_eq!(items[2].cost, Some(1500));
    }

    #[test]
    fn family_tables_prefix_their_rows() {
        let t = table(
            &["Filter Mask", "TL", "EFFECT", "KG", "COST"],
            &[&["Basic", "3", "Protection against smoke", "—", "Cr10"]],
        );
        let items = items(&BOOKS[0], &[t]);
        assert_eq!(items[0].name, "Filter Mask (Basic)");
        assert_eq!(items[0].kind, ItemKind::Gear);
        assert_eq!(items[0].effect, "Protection against smoke");
        assert_eq!(items[0].kg, None);
    }

    #[test]
    fn armour_gets_armour_stats() {
        let t = table(
            &[
                "ARMOUR TYPE",
                "PROTECTION",
                "TL",
                "RAD",
                "KG",
                "COST",
                "REQUIRED SKILL",
            ],
            &[&[
                "Vacc Suit",
                "+8",
                "10",
                "60",
                "17",
                "Cr10000",
                "Vacc Suit 0",
            ]],
        );
        let item = &items(&BOOKS[1], &[t])[0];
        let a = item.armour.as_ref().unwrap();
        assert_eq!(
            (a.protection.as_str(), a.rad, a.required_skill.as_str()),
            ("+8", Some(60), "Vacc Suit 0")
        );
        assert_eq!(item.section, "Equipment");
    }

    #[test]
    fn sections_follow_page_ranges() {
        assert_eq!(BOOKS[0].section(12), "Armour");
        assert_eq!(BOOKS[0].section(139), "Weaponry");
        assert_eq!(BOOKS[0].section(177), "Specialised Ammunition");
    }
}
