//! Field descriptions for the edit forms, and turning form text into
//! stored values with clear messages when it doesn't fit.
//!
//! Keys match the Rust types in `traveller-model` (`sheet.rs` and
//! `campaign_state.rs`).

use serde_json::Value;
use traveller_rules::Credits;

/// What kind of value a field holds.
#[derive(Debug, Clone, Copy, PartialEq)]
pub enum Kind {
    /// One line of text.
    Text,
    /// Several lines.
    Long,
    /// A whole number, required, within bounds.
    Int { min: i64, max: i64 },
    /// A whole number or blank.
    OptInt { min: i64, max: i64 },
    /// A decimal (kilograms) or blank.
    OptDecimal,
    /// A tick box.
    Bool,
    /// One of a fixed set: (stored value, label).
    Choice(&'static [(&'static str, &'static str)]),
}

/// One field of a form.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Field {
    pub key: &'static str,
    pub label: &'static str,
    pub kind: Kind,
    /// Text that must not be blank.
    pub required: bool,
}

const fn field(key: &'static str, label: &'static str, kind: Kind, required: bool) -> Field {
    Field {
        key,
        label,
        kind,
        required,
    }
}
const fn text(key: &'static str, label: &'static str) -> Field {
    field(key, label, Kind::Text, false)
}
const fn name(key: &'static str, label: &'static str) -> Field {
    field(key, label, Kind::Text, true)
}
const fn long(key: &'static str, label: &'static str) -> Field {
    field(key, label, Kind::Long, false)
}
const fn int(key: &'static str, label: &'static str, min: i64, max: i64) -> Field {
    field(key, label, Kind::Int { min, max }, false)
}
const fn opt_int(key: &'static str, label: &'static str, min: i64, max: i64) -> Field {
    field(key, label, Kind::OptInt { min, max }, false)
}
const fn kg(key: &'static str, label: &'static str) -> Field {
    field(key, label, Kind::OptDecimal, false)
}
const fn tick(key: &'static str, label: &'static str) -> Field {
    field(key, label, Kind::Bool, false)
}
const fn choice(
    key: &'static str,
    label: &'static str,
    options: &'static [(&'static str, &'static str)],
) -> Field {
    field(key, label, Kind::Choice(options), false)
}

const MONEY: i64 = 1_000_000_000_000;
const TL: Field = opt_int("tl", "TL", 0, 33);
const COST: Field = opt_int("cost", "Cost (Cr)", 0, MONEY);

// ---------------------------------------------------------------------------
// Character sheet

pub const SKILLS: &[Field] = &[
    name("name", "Skill (speciality)"),
    int("level", "Level", 0, 15),
];
pub const WEAPONS: &[Field] = &[
    name("name", "Weapon"),
    TL,
    text("range", "Range"),
    text("damage", "Damage"),
    opt_int("magazine", "Magazine", 0, 10_000),
    opt_int("rounds", "Rounds loaded", 0, 10_000),
    int("spare_magazines", "Spare magazines", 0, 1000),
    kg("kg", "Kg"),
    COST,
    text("traits", "Traits"),
    long("notes", "Notes"),
];
pub const AMMO: &[Field] = &[
    name("name", "Ammunition"),
    text("weapon", "For weapon"),
    int("rounds", "Rounds", 0, 100_000),
    opt_int("capacity", "Capacity", 0, 100_000),
    long("notes", "Notes"),
];
pub const ARMOUR: &[Field] = &[
    name("name", "Armour"),
    int("protection", "Protection", 0, 100),
    opt_int("rad", "Rad", 0, 10_000),
    TL,
    kg("kg", "Kg"),
    COST,
    tick("worn", "Worn now"),
    long("notes", "Notes"),
];
pub const GEAR: &[Field] = &[
    name("name", "Item"),
    TL,
    int("quantity", "Quantity", 0, 100_000),
    kg("kg", "Kg each"),
    COST,
    long("notes", "Notes"),
];
pub const AUGMENTS: &[Field] = &[name("name", "Augment"), TL, text("effect", "Effect")];
pub const LEDGER: &[Field] = &[
    text("date", "Date"),
    name("description", "Entry"),
    int(
        "amount",
        "Amount (Cr, negative for spending)",
        -MONEY,
        MONEY,
    ),
];
pub const PEOPLE: &[Field] = &[
    choice(
        "relation",
        "Type",
        &[
            ("contact", "Contact"),
            ("ally", "Ally"),
            ("rival", "Rival"),
            ("enemy", "Enemy"),
        ],
    ),
    name("name", "Name"),
    text("location", "Location"),
    text("relationship", "Relationship"),
];
pub const CAREER: &[Field] = &[
    name("career", "Career"),
    text("assignment", "Assignment"),
    text("rank", "Rank"),
    long("events", "Events"),
    long("gained", "Gained"),
];
pub const TRAINING: &[Field] = &[
    name("skill", "Skill"),
    int("weeks_done", "Weeks done", 0, 1000),
    int("weeks_needed", "Weeks needed", 0, 1000),
];
pub const IDENTITY: &[Field] = &[
    text("species", "Species"),
    text("gender", "Gender"),
    opt_int("age", "Age", 0, 10_000),
    text("homeworld", "Homeworld"),
    text("citizenship", "Citizenship"),
    text("background", "Background"),
    text("education", "Education"),
];
pub const FINANCES: &[Field] = &[
    int("cash", "Cash on hand (Cr)", -MONEY, MONEY),
    int("pension", "Pension (Cr per year)", 0, MONEY),
    int("debt", "Debts (Cr)", 0, MONEY),
    int("living_cost", "Living cost (Cr per month)", 0, MONEY),
];
pub const NOTES: &[Field] = &[
    long("notes", "Notes"),
    long("injuries", "Injuries and conditions"),
    int("rads", "Accumulated radiation (rads)", 0, 100_000),
];

// ---------------------------------------------------------------------------
// Campaign

pub const WHERE_AND_WHEN: &[Field] = &[text("location", "Location")];
pub const DATE: &[Field] = &[
    int("day", "Day (1–365)", 1, 365),
    int("year", "Year", 0, 100_000),
];
pub const SHIP: &[Field] = &[
    name("name", "Ship's name"),
    text("class", "Class"),
    int("tons", "Hull tons", 0, 10_000_000),
    TL,
    text("configuration", "Configuration"),
    int("hull_max", "Hull points (max)", 0, 10_000_000),
    opt_int("hull", "Hull points (now)", 0, 10_000_000),
    int("armour", "Armour", 0, 1000),
    int("thrust", "Thrust (M-drive)", 0, 20),
    int("jump", "Jump (J-drive)", 0, 9),
    opt_int("power", "Power", 0, 10_000_000),
    int("fuel_capacity", "Fuel tanks (tons)", 0, 10_000_000),
    int("fuel", "Fuel aboard (tons)", 0, 10_000_000),
    int("cargo_capacity", "Cargo hold (tons)", 0, 10_000_000),
    int("staterooms", "Staterooms", 0, 100_000),
    int("low_berths", "Low berths", 0, 100_000),
    int(
        "people_aboard",
        "People aboard (not in low berths)",
        0,
        100_000,
    ),
    int("low_berths_occupied", "Low berths occupied", 0, 100_000),
    int("purchase_price", "Purchase price (Cr)", 0, MONEY),
    int("mortgage_remaining", "Mortgage still owed (Cr)", 0, MONEY),
    int("crew_salaries", "Hired crew pay per period (Cr)", 0, MONEY),
    long("systems", "Systems, sensors, software"),
    long("weapons", "Weapons"),
];
pub const CREW: &[Field] = &[
    name("role", "Position"),
    text("filled_by", "Filled by"),
    text("skill", "Skill"),
];
pub const FUNDS: &[Field] = &[int("balance", "Balance (Cr)", -MONEY, MONEY)];
pub const FUNDS_LEDGER: &[Field] = &[
    text("date", "Date"),
    name("description", "Entry"),
    int(
        "amount",
        "Amount (Cr, negative for spending)",
        -MONEY,
        MONEY,
    ),
    text("category", "Category"),
    text("by", "Paid or received by"),
    long("notes", "Notes"),
];
pub const LOCKER: &[Field] = &[
    name("name", "Item"),
    int("quantity", "Quantity", 0, 100_000),
    text("signed_out_to", "Signed out to"),
    long("notes", "Notes"),
];
pub const CARGO: &[Field] = &[
    name("goods", "Goods"),
    int("tons", "Tons", 0, 10_000_000),
    int("paid", "Paid (Cr)", 0, MONEY),
    text("bought_at", "Bought at"),
    text("destination", "Bound for"),
    long("notes", "Notes"),
];
pub const CONTRACTS: &[Field] = &[
    choice(
        "kind",
        "Kind",
        &[
            ("freight", "Freight"),
            ("passengers", "Passengers"),
            ("mail", "Mail"),
            ("charter", "Charter"),
            ("other", "Other"),
        ],
    ),
    name("description", "Description"),
    opt_int("tons", "Tons", 0, 10_000_000),
    opt_int("passengers", "Passengers", 0, 100_000),
    int("payment", "Payment (Cr)", 0, MONEY),
    text("destination", "Destination"),
    choice(
        "status",
        "Status",
        &[
            ("booked", "Booked"),
            ("aboard", "Aboard"),
            ("delivered", "Delivered"),
        ],
    ),
];
pub const TRADES: &[Field] = &[
    choice(
        "side",
        "Buy or sell",
        &[("buy", "Bought"), ("sell", "Sold")],
    ),
    name("goods", "Goods"),
    int("tons", "Tons", 0, 10_000_000),
    int("price_per_ton", "Price per ton (Cr)", 0, MONEY),
    text("world", "World"),
    text("date", "Date"),
    text("by", "Deal made by"),
    long("notes", "Notes"),
];
pub const NEXT_JUMP: &[Field] = &[
    text("next_destination", "Next destination"),
    opt_int("next_parsecs", "Distance (parsecs)", 0, 9),
];
pub const WORLDS: &[Field] = &[
    name("name", "World"),
    text("uwp", "UWP"),
    long("notes", "Notes"),
];
pub const MISSIONS: &[Field] = &[
    name("job", "Job"),
    text("patron", "Patron"),
    opt_int("reward", "Reward (Cr)", 0, MONEY),
    text("status", "Status"),
];
pub const JOURNAL: &[Field] = &[
    text("date", "Date"),
    name("title", "Title"),
    long("text", "Entry"),
    text("by", "Written by"),
];

// ---------------------------------------------------------------------------
// Parsing

/// Longest one-line text.
pub const MAX_TEXT: usize = 200;
/// Longest multi-line text.
pub const MAX_LONG: usize = 4000;

/// A stored value as form text.
pub fn to_text(v: Option<&Value>) -> String {
    match v {
        None | Some(Value::Null) => String::new(),
        Some(Value::String(s)) => s.clone(),
        Some(Value::Bool(b)) => b.to_string(),
        Some(other) => other.to_string(),
    }
}

/// Form text as a stored value, or a message saying what's wrong.
pub fn parse(field: &Field, raw: &str) -> Result<Value, String> {
    let raw = raw.trim();
    let label = field.label;
    match field.kind {
        Kind::Text | Kind::Long => {
            let limit = if field.kind == Kind::Text {
                MAX_TEXT
            } else {
                MAX_LONG
            };
            if field.required && raw.is_empty() {
                Err(format!("{label} is required."))
            } else if raw.chars().count() > limit {
                Err(format!("{label} is too long (at most {limit} characters)."))
            } else {
                Ok(Value::String(raw.to_string()))
            }
        }
        Kind::Int { min, max } => whole(raw, label, min, max).map(Value::from),
        Kind::OptInt { min, max } => {
            if raw.is_empty() {
                Ok(Value::Null)
            } else {
                whole(raw, label, min, max).map(Value::from)
            }
        }
        Kind::OptDecimal => {
            if raw.is_empty() {
                return Ok(Value::Null);
            }
            match raw.replace(',', ".").parse::<f64>() {
                Ok(n) if n.is_finite() && (0.0..=1_000_000.0).contains(&n) => Ok(Value::from(n)),
                _ => Err(format!("{label} must be a number, e.g. 2.5.")),
            }
        }
        Kind::Bool => Ok(Value::Bool(raw == "true")),
        Kind::Choice(options) => options
            .iter()
            .find(|(value, _)| *value == raw)
            .map(|(value, _)| Value::String((*value).to_string()))
            .ok_or_else(|| format!("Choose a {}.", label.to_lowercase())),
    }
}

/// A whole number within bounds; commas and spaces are ignored.
pub fn whole(raw: &str, label: &str, min: i64, max: i64) -> Result<i64, String> {
    let cleaned: String = raw
        .chars()
        .filter(|c| *c != ',' && !c.is_whitespace())
        .collect();
    match cleaned.parse::<i64>() {
        Ok(n) if (min..=max).contains(&n) => Ok(n),
        Ok(_) => Err(format!("{label} must be between {min} and {max}.")),
        Err(_) => Err(format!("{label} must be a whole number.")),
    }
}

/// The form's values as stored fields, or the first problem.
pub fn collect(
    fields: &[Field],
    values: &[String],
) -> Result<serde_json::Map<String, Value>, String> {
    fields
        .iter()
        .zip(values)
        .map(|(f, raw)| parse(f, raw).map(|v| (f.key.to_string(), v)))
        .collect()
}

/// Starting values for a new item.
pub fn blank(fields: &[Field]) -> Vec<String> {
    fields
        .iter()
        .map(|f| match f.kind {
            Kind::Int { .. } if f.key == "quantity" => "1".into(),
            Kind::Int { min, .. } => min.max(0).to_string(),
            Kind::Choice(options) => options[0].0.into(),
            Kind::Bool => "false".into(),
            _ => String::new(),
        })
        .collect()
}

/// One value as the summary shows it, labelled where a bare number would
/// mean nothing: "TL4", "Cr1,500", "1 kg", "Magazine 6". `None` when
/// empty, or a required number that's zero.
fn summary_part(field: &Field, value: Option<&Value>) -> Option<String> {
    let text = to_text(value);
    if text.is_empty() {
        return None;
    }
    let number = value.and_then(Value::as_i64);
    let is_money = field.key == "cost" || field.label.contains("(Cr");
    Some(match field.kind {
        Kind::Choice(options) => options
            .iter()
            .find(|(v, _)| *v == text)
            .map_or(text, |(_, l)| (*l).to_string()),
        Kind::Int { .. } if number == Some(0) => return None,
        Kind::Int { .. } | Kind::OptInt { .. } => match number {
            Some(n) if field.key == "tl" => format!("TL{n}"),
            Some(n) if is_money => Credits(n).to_string(),
            _ => {
                let label = field.label.split(" (").next().unwrap_or(field.label);
                format!("{label} {text}")
            }
        },
        Kind::OptDecimal => format!("{text} kg"),
        _ => text,
    })
}

/// One line describing an item: its first six values, labelled where
/// needed.
pub fn summary(fields: &[Field], item: &Value) -> String {
    let parts: Vec<String> = fields
        .iter()
        .filter(|f| !matches!(f.kind, Kind::Long | Kind::Bool))
        .filter_map(|f| summary_part(f, item.get(f.key)))
        .take(6)
        .collect();
    if parts.is_empty() {
        "(blank)".into()
    } else {
        parts.join(" · ")
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn parses_each_kind() {
        let level = int("level", "Level", 0, 15);
        assert_eq!(parse(&level, " 2 "), Ok(Value::from(2)));
        assert!(
            parse(&level, "16")
                .unwrap_err()
                .contains("between 0 and 15")
        );
        assert!(parse(&level, "two").unwrap_err().contains("whole number"));
        assert_eq!(parse(&TL, ""), Ok(Value::Null));
        assert_eq!(parse(&COST, "1,500"), Ok(Value::from(1500)));
        assert_eq!(parse(&kg("kg", "Kg"), "2,5"), Ok(Value::from(2.5)));
        assert!(parse(&kg("kg", "Kg"), "-1").is_err());
        assert!(
            parse(&name("name", "Weapon"), "  ")
                .unwrap_err()
                .contains("required")
        );
        assert!(parse(&text("t", "T"), &"x".repeat(201)).is_err());
        assert_eq!(parse(&PEOPLE[0], "rival"), Ok(Value::from("rival")));
        assert!(parse(&PEOPLE[0], "friend").is_err());
    }

    #[test]
    fn collects_or_reports_the_first_problem() {
        let ok = collect(SKILLS, &["Pilot".into(), "2".into()]).unwrap();
        assert_eq!(Value::Object(ok), json!({"name": "Pilot", "level": 2}));
        assert!(
            collect(SKILLS, &[String::new(), "2".into()])
                .unwrap_err()
                .contains("required")
        );
    }

    #[test]
    fn blanks_have_sensible_defaults() {
        assert_eq!(blank(GEAR)[2], "1", "quantity starts at 1");
        assert_eq!(blank(CONTRACTS)[0], "freight");
        assert_eq!(blank(DATE)[0], "1");
    }

    /// A new-item form with its required text filled in.
    fn filled(fields: &[Field]) -> Value {
        let values: Vec<String> = fields
            .iter()
            .zip(blank(fields))
            .map(|(f, v)| {
                if f.required {
                    "Something".to_string()
                } else {
                    v
                }
            })
            .collect();
        Value::Object(collect(fields, &values).unwrap())
    }

    #[test]
    fn campaign_fields_fit_the_model() {
        // Every shared form, as submitted, deserialises into the model.
        use traveller_model::campaign_state::{
            CampaignState, CargoLot, Contract, CrewPosition, FundsEntry, JournalEntry, LockerItem,
            Mission, Trade, World,
        };
        let _: Contract = serde_json::from_value(filled(CONTRACTS)).unwrap();
        let _: Trade = serde_json::from_value(filled(TRADES)).unwrap();
        let _: CargoLot = serde_json::from_value(filled(CARGO)).unwrap();
        let _: LockerItem = serde_json::from_value(filled(LOCKER)).unwrap();
        let _: FundsEntry = serde_json::from_value(filled(FUNDS_LEDGER)).unwrap();
        let _: CrewPosition = serde_json::from_value(filled(CREW)).unwrap();
        let _: World = serde_json::from_value(filled(WORLDS)).unwrap();
        let _: Mission = serde_json::from_value(filled(MISSIONS)).unwrap();
        let _: JournalEntry = serde_json::from_value(filled(JOURNAL)).unwrap();
        let state: CampaignState = serde_json::from_value(json!({
            "ship": filled(SHIP),
            "funds": filled(FUNDS),
            "date": filled(DATE),
            "travel": filled(NEXT_JUMP),
        }))
        .unwrap();
        assert_eq!(state.ship.name, "Something");
        assert_eq!(state.date.map(|d| d.day), Some(1));
    }

    #[test]
    fn summaries_use_labels_and_skip_long_text() {
        let item = json!({"relation": "ally", "name": "Dax", "location": "", "relationship": "Old crewmate"});
        assert_eq!(summary(PEOPLE, &item), "Ally · Dax · Old crewmate");
        assert_eq!(summary(PEOPLE, &json!({})), "(blank)");
    }

    #[test]
    fn summaries_label_numbers() {
        let revolver = json!({"name": "Revolver", "tl": 4, "range": "10m", "damage": "3D-3",
            "magazine": 6, "rounds": 6, "spare_magazines": 0, "kg": 1.0, "cost": 150});
        assert_eq!(
            summary(WEAPONS, &revolver),
            "Revolver · TL4 · 10m · 3D-3 · Magazine 6 · Rounds loaded 6"
        );
        let mask = json!({"name": "Filter Mask", "tl": 3, "quantity": 2, "kg": 0.5, "cost": 1500});
        assert_eq!(
            summary(GEAR, &mask),
            "Filter Mask · TL3 · Quantity 2 · 0.5 kg · Cr1,500"
        );
        let spent = json!({"date": "2026-11-11", "description": "Fuel", "amount": -500});
        assert_eq!(
            summary(LEDGER, &spent),
            format!("2026-11-11 · Fuel · {}", Credits(-500))
        );
    }
}
