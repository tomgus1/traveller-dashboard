//! Edit forms for the character sheet.
//!
//! One generic list editor and one section editor, driven by field
//! descriptions, cover every part of the sheet. Edits are made on the
//! sheet's JSON and turned back into the typed [`CharacterSheet`] before
//! saving, so a bad value is reported instead of stored. Keys a form
//! doesn't know about are kept as they were.

use dioxus::prelude::*;
use serde_json::{Map, Value};
use traveller_model::CharacterSheet;
use traveller_rules::Characteristic;

use super::editor::use_editor;

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

const fn text(key: &'static str, label: &'static str) -> Field {
    Field {
        key,
        label,
        kind: Kind::Text,
        required: false,
    }
}
const fn name(key: &'static str, label: &'static str) -> Field {
    Field {
        key,
        label,
        kind: Kind::Text,
        required: true,
    }
}
const fn long(key: &'static str, label: &'static str) -> Field {
    Field {
        key,
        label,
        kind: Kind::Long,
        required: false,
    }
}
const fn int(key: &'static str, label: &'static str, min: i64, max: i64) -> Field {
    Field {
        key,
        label,
        kind: Kind::Int { min, max },
        required: false,
    }
}
const fn opt_int(key: &'static str, label: &'static str, min: i64, max: i64) -> Field {
    Field {
        key,
        label,
        kind: Kind::OptInt { min, max },
        required: false,
    }
}
const fn kg(key: &'static str, label: &'static str) -> Field {
    Field {
        key,
        label,
        kind: Kind::OptDecimal,
        required: false,
    }
}
const fn tick(key: &'static str, label: &'static str) -> Field {
    Field {
        key,
        label,
        kind: Kind::Bool,
        required: false,
    }
}

const TL: Field = opt_int("tl", "TL", 0, 33);
const COST: Field = opt_int("cost", "Cost (Cr)", 0, 1_000_000_000_000);
const MONEY: i64 = 1_000_000_000_000;

// The sheet's sections. Keys match crates/traveller-model/src/sheet.rs.
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
    Field {
        key: "relation",
        label: "Type",
        kind: Kind::Choice(&[
            ("contact", "Contact"),
            ("ally", "Ally"),
            ("rival", "Rival"),
            ("enemy", "Enemy"),
        ]),
        required: false,
    },
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

const MAX_TEXT: usize = 200;
const MAX_LONG: usize = 4000;

// ---------------------------------------------------------------------------
// JSON helpers

/// The value at a dotted path ("" is the root).
fn at<'a>(root: &'a Value, path: &str) -> Option<&'a Value> {
    if path.is_empty() {
        return Some(root);
    }
    path.split('.').try_fold(root, |v, key| v.get(key))
}

/// The value at a dotted path, created as an object or `default` if absent.
fn at_mut<'a>(root: &'a mut Value, path: &str, default: &Value) -> &'a mut Value {
    if path.is_empty() {
        return root;
    }
    let mut keys = path.split('.').peekable();
    let mut v = root;
    while let Some(key) = keys.next() {
        if !v.is_object() {
            *v = Value::Object(Map::new());
        }
        let fill = if keys.peek().is_some() {
            Value::Object(Map::new())
        } else {
            default.clone()
        };
        v = v
            .as_object_mut()
            .expect("just made an object")
            .entry(key)
            .or_insert(fill);
    }
    v
}

/// A stored value as form text.
fn to_text(v: Option<&Value>) -> String {
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

fn whole(raw: &str, label: &str, min: i64, max: i64) -> Result<i64, String> {
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

/// Writes the form's values over `target` (keeping keys the form lacks).
fn apply(
    fields: &[Field],
    values: &[String],
    target: &mut Map<String, Value>,
) -> Result<(), String> {
    for (field, raw) in fields.iter().zip(values) {
        target.insert(field.key.to_string(), parse(field, raw)?);
    }
    Ok(())
}

/// Turns edited JSON back into a sheet, explaining any problem.
fn to_sheet(value: Value) -> Result<CharacterSheet, String> {
    serde_json::from_value(value).map_err(|e| format!("That doesn't fit the sheet: {e}"))
}

fn sheet_json(sheet: &CharacterSheet) -> Value {
    serde_json::to_value(sheet).unwrap_or(Value::Object(Map::new()))
}

// ---------------------------------------------------------------------------
// Components

/// Inputs for `fields`, bound to `values` (same order).
#[component]
fn Inputs(id: String, fields: &'static [Field], values: Signal<Vec<String>>) -> Element {
    let mut values = values;
    rsx! {
        div { class: "form-grid",
            for (i, field) in fields.iter().enumerate() {
                {
                    let input_id = format!("{id}-{}", field.key);
                    let value = values.read().get(i).cloned().unwrap_or_default();
                    let wide = matches!(field.kind, Kind::Long);
                    rsx! {
                        div { key: "{input_id}", class: if wide { "field wide" } else { "field" },
                            match field.kind {
                                Kind::Bool => rsx! {
                                    label { class: "check",
                                        input { id: "{input_id}", r#type: "checkbox", checked: value == "true",
                                            onchange: move |e| values.write()[i] = e.checked().to_string() }
                                        "{field.label}"
                                    }
                                },
                                Kind::Long => rsx! {
                                    label { r#for: "{input_id}", "{field.label}" }
                                    textarea { id: "{input_id}", rows: "3", maxlength: "{MAX_LONG}", value: "{value}",
                                        oninput: move |e| values.write()[i] = e.value() }
                                },
                                Kind::Choice(options) => rsx! {
                                    label { r#for: "{input_id}", "{field.label}" }
                                    select { id: "{input_id}", onchange: move |e| values.write()[i] = e.value(),
                                        for (v, l) in options.iter() {
                                            option { key: "{v}", value: "{v}", selected: value == *v, "{l}" }
                                        }
                                    }
                                },
                                Kind::Int { .. } | Kind::OptInt { .. } => rsx! {
                                    label { r#for: "{input_id}", "{field.label}" }
                                    input { id: "{input_id}", r#type: "text", inputmode: "numeric", value: "{value}",
                                        oninput: move |e| values.write()[i] = e.value() }
                                },
                                Kind::OptDecimal => rsx! {
                                    label { r#for: "{input_id}", "{field.label}" }
                                    input { id: "{input_id}", r#type: "text", inputmode: "decimal", value: "{value}",
                                        oninput: move |e| values.write()[i] = e.value() }
                                },
                                Kind::Text => rsx! {
                                    label { r#for: "{input_id}", "{field.label}" }
                                    input { id: "{input_id}", r#type: "text", maxlength: "{MAX_TEXT}", value: "{value}",
                                        required: field.required,
                                        oninput: move |e| values.write()[i] = e.value() }
                                },
                            }
                        }
                    }
                }
            }
        }
    }
}

#[derive(Clone, Copy, PartialEq)]
enum Editing {
    New,
    Item(usize),
}

/// Add, edit and remove the items of one list on the sheet.
#[component]
pub fn ListEditor(
    /// Dotted path to the list, e.g. "weapons" or "finances.ledger".
    path: &'static str,
    title: &'static str,
    fields: &'static [Field],
) -> Element {
    let editor = use_editor();
    let mut editing = use_signal(|| None::<Editing>);
    let mut values = use_signal(Vec::<String>::new);
    let mut error = use_signal(|| None::<String>);
    let mut confirm_remove = use_signal(|| None::<usize>);
    let busy = (editor.saving)();

    let items: Vec<Value> = at(&sheet_json(&editor.sheet.read()), path)
        .and_then(Value::as_array)
        .cloned()
        .unwrap_or_default();

    let mut open = move |which: Editing, item: Option<&Value>| {
        values.set(
            fields
                .iter()
                .map(|f| to_text(item.and_then(|v| v.get(f.key))))
                .collect(),
        );
        if item.is_none() {
            // Sensible starting values for a new item.
            let mut v = values.write();
            for (i, f) in fields.iter().enumerate() {
                match f.kind {
                    Kind::Int { .. } if f.key == "quantity" => v[i] = "1".into(),
                    Kind::Int { min, .. } => v[i] = min.max(0).to_string(),
                    Kind::Choice(options) => v[i] = options[0].0.into(),
                    Kind::Bool => v[i] = "false".into(),
                    _ => {}
                }
            }
        }
        error.set(None);
        confirm_remove.set(None);
        editing.set(Some(which));
    };

    let save = move |evt: FormEvent| {
        evt.prevent_default();
        let Some(which) = editing() else { return };
        let mut json = sheet_json(&editor.sheet.peek());
        let list = at_mut(&mut json, path, &Value::Array(Vec::new()));
        let Some(list) = list.as_array_mut() else {
            return;
        };
        let mut item = match which {
            Editing::Item(i) => list
                .get(i)
                .and_then(Value::as_object)
                .cloned()
                .unwrap_or_default(),
            Editing::New => Map::new(),
        };
        if let Err(message) = apply(fields, &values.read(), &mut item) {
            error.set(Some(message));
            return;
        }
        match which {
            Editing::Item(i) if i < list.len() => list[i] = Value::Object(item),
            _ => list.push(Value::Object(item)),
        }
        match to_sheet(json) {
            Ok(sheet) => {
                editor.update_sheet("Saved.", move |s| *s = sheet);
                editing.set(None);
            }
            Err(message) => error.set(Some(message)),
        }
    };

    let mut remove = move |index: usize| {
        let mut json = sheet_json(&editor.sheet.peek());
        if let Some(list) = at_mut(&mut json, path, &Value::Array(Vec::new())).as_array_mut() {
            if index < list.len() {
                list.remove(index);
            }
        }
        if let Ok(sheet) = to_sheet(json) {
            editor.update_sheet("Removed.", move |s| *s = sheet);
        }
        confirm_remove.set(None);
        editing.set(None);
    };

    let form_id = path.replace('.', "-");
    rsx! {
        section { class: "edit-section", aria_labelledby: "edit-{form_id}",
            div { class: "edit-head",
                h2 { id: "edit-{form_id}", class: "section", "{title}" }
                if editing().is_none() {
                    button { class: "mini", r#type: "button", disabled: busy,
                        onclick: move |_| open(Editing::New, None), "Add" }
                }
            }

            if let Some(which) = editing() {
                form { class: "edit-form", onsubmit: save,
                    h3 { if which == Editing::New { "New entry" } else { "Edit entry" } }
                    Inputs { id: "{form_id}", fields, values }
                    if let Some(message) = error() {
                        p { class: "error", role: "alert", "{message}" }
                    }
                    div { class: "inline",
                        button { class: "btn", r#type: "submit", disabled: busy, "Save" }
                        button { class: "btn outline", r#type: "button", onclick: move |_| editing.set(None), "Cancel" }
                    }
                }
            }

            if items.is_empty() {
                p { class: "muted", "Nothing recorded yet." }
            } else {
                ul { class: "edit-list",
                    for (i, item) in items.iter().enumerate() {
                        li { key: "{i}",
                            span { class: "edit-summary", {summary(fields, item)} }
                            if confirm_remove() == Some(i) {
                                span { class: "row-actions",
                                    button { class: "mini", r#type: "button", disabled: busy,
                                        onclick: move |_| remove(i), "Confirm remove" }
                                    button { class: "mini outline", r#type: "button",
                                        onclick: move |_| confirm_remove.set(None), "Keep" }
                                }
                            } else {
                                span { class: "row-actions",
                                    button { class: "mini outline", r#type: "button", disabled: busy,
                                        onclick: {
                                            let item = item.clone();
                                            move |_| open(Editing::Item(i), Some(&item))
                                        },
                                        "Edit" }
                                    button { class: "mini outline", r#type: "button", disabled: busy,
                                        onclick: move |_| confirm_remove.set(Some(i)), "Remove" }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

/// One line describing an item: its first three non-empty values.
fn summary(fields: &[Field], item: &Value) -> String {
    let parts: Vec<String> = fields
        .iter()
        .filter(|f| !matches!(f.kind, Kind::Long | Kind::Bool))
        .filter_map(|f| {
            let text = to_text(item.get(f.key));
            (!text.is_empty()).then(|| match f.kind {
                Kind::Choice(options) => options
                    .iter()
                    .find(|(v, _)| *v == text)
                    .map_or(text, |(_, l)| (*l).to_string()),
                _ => text,
            })
        })
        .take(3)
        .collect();
    if parts.is_empty() {
        "(blank)".into()
    } else {
        parts.join(" · ")
    }
}

/// Edits fields of one part of the sheet in place ("" is the top level).
#[component]
pub fn SectionEditor(path: &'static str, title: &'static str, fields: &'static [Field]) -> Element {
    let editor = use_editor();
    let initial = {
        let json = sheet_json(&editor.sheet.read());
        let object = at(&json, path).cloned().unwrap_or(Value::Null);
        fields
            .iter()
            .map(|f| to_text(object.get(f.key)))
            .collect::<Vec<_>>()
    };
    let values = use_signal(|| initial);
    let mut error = use_signal(|| None::<String>);
    let busy = (editor.saving)();

    let save = move |evt: FormEvent| {
        evt.prevent_default();
        let mut json = sheet_json(&editor.sheet.peek());
        let target = at_mut(&mut json, path, &Value::Object(Map::new()));
        if !target.is_object() {
            *target = Value::Object(Map::new());
        }
        let object = target.as_object_mut().expect("object");
        if let Err(message) = apply(fields, &values.read(), object) {
            error.set(Some(message));
            return;
        }
        match to_sheet(json) {
            Ok(sheet) => {
                error.set(None);
                editor.update_sheet("Saved.", move |s| *s = sheet);
            }
            Err(message) => error.set(Some(message)),
        }
    };

    let form_id = if path.is_empty() {
        "sheet".to_string()
    } else {
        path.replace('.', "-")
    };
    rsx! {
        section { class: "edit-section", aria_labelledby: "edit-{form_id}-{title}",
            h2 { id: "edit-{form_id}-{title}", class: "section", "{title}" }
            form { class: "edit-form", onsubmit: save,
                Inputs { id: "{form_id}", fields, values }
                if let Some(message) = error() {
                    p { class: "error", role: "alert", "{message}" }
                }
                button { class: "btn", r#type: "submit", disabled: busy, "Save {title.to_lowercase()}" }
            }
        }
    }
}

/// Edits the maximum of each characteristic (the `characters` row).
#[component]
pub fn CharacteristicsEditor() -> Element {
    let editor = use_editor();
    let stats = *editor.stats.read();
    let mut values = use_signal(|| {
        Characteristic::ALL
            .iter()
            .map(|&c| stats.get(c).value.to_string())
            .collect::<Vec<_>>()
    });
    let mut error = use_signal(|| None::<String>);
    let busy = (editor.saving)();

    let save = move |evt: FormEvent| {
        evt.prevent_default();
        let mut maxima = Vec::new();
        for (c, raw) in Characteristic::ALL.iter().zip(values.read().iter()) {
            match whole(raw, c.abbreviation(), 0, 33) {
                Ok(n) => maxima.push(i32::try_from(n).unwrap_or(0)),
                Err(m) => {
                    error.set(Some(m));
                    return;
                }
            }
        }
        error.set(None);
        editor.update_stats("Characteristics saved.", move |s| {
            for (&c, max) in Characteristic::ALL.iter().zip(maxima) {
                let stat = match c {
                    Characteristic::Str => &mut s.str,
                    Characteristic::Dex => &mut s.dex,
                    Characteristic::End => &mut s.end,
                    Characteristic::Int => &mut s.int,
                    Characteristic::Edu => &mut s.edu,
                    Characteristic::Soc => &mut s.soc,
                };
                let current = stat.current().min(max);
                stat.value = max;
                stat.current = (current < max).then_some(current);
            }
        });
    };

    rsx! {
        section { class: "edit-section", aria_labelledby: "edit-chars",
            h2 { id: "edit-chars", class: "section", "Characteristics" }
            p { class: "muted small", "Maximum values. Damage and healing are on the Overview." }
            form { class: "edit-form", onsubmit: save,
                div { class: "stat-inputs",
                    for (i, c) in Characteristic::ALL.iter().enumerate() {
                        div { key: "{c}", class: "field",
                            label { r#for: "max-{c}", "{c}" }
                            input { id: "max-{c}", r#type: "text", inputmode: "numeric",
                                value: "{values.read()[i]}",
                                oninput: move |e| values.write()[i] = e.value() }
                        }
                    }
                }
                if let Some(message) = error() {
                    p { class: "error", role: "alert", "{message}" }
                }
                button { class: "btn", r#type: "submit", disabled: busy, "Save characteristics" }
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

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
    fn paths_reach_nested_lists() {
        let mut v = serde_json::json!({"finances": {"cash": 5}});
        at_mut(&mut v, "finances.ledger", &Value::Array(Vec::new()))
            .as_array_mut()
            .unwrap()
            .push(Value::from(1));
        assert_eq!(at(&v, "finances.ledger"), Some(&serde_json::json!([1])));
        assert_eq!(at(&v, "finances.cash"), Some(&Value::from(5)));
        assert_eq!(at(&v, ""), Some(&v.clone()));
    }

    #[test]
    fn editing_keeps_unknown_keys_and_round_trips() {
        let mut sheet = CharacterSheet::default();
        sheet.weapons.push(traveller_model::sheet::Weapon {
            name: "Autopistol".into(),
            ..Default::default()
        });
        let mut json = sheet_json(&sheet);
        json["weapons"][0]["future_field"] = Value::from("kept");

        let item = json["weapons"][0].as_object_mut().unwrap();
        let values: Vec<String> = WEAPONS.iter().map(|f| to_text(item.get(f.key))).collect();
        let mut values = values;
        values[4] = "15".into(); // magazine
        apply(WEAPONS, &values, item).unwrap();
        assert_eq!(item["future_field"], "kept");

        let back = to_sheet(json).unwrap();
        assert_eq!(back.weapons[0].magazine, Some(15));
        assert_eq!(back.weapons[0].name, "Autopistol");
    }

    #[test]
    fn summaries_use_labels_and_skip_long_text() {
        let item = serde_json::json!({"relation": "ally", "name": "Dax", "location": "", "relationship": "Old crewmate"});
        assert_eq!(summary(PEOPLE, &item), "Ally · Dax · Old crewmate");
        assert_eq!(summary(PEOPLE, &serde_json::json!({})), "(blank)");
    }
}
