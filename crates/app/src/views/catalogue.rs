//! Picking gear from the rulebook catalogue onto a character sheet.
//!
//! The catalogue (`catalogue_items`, migration 10) is readable by members
//! of any campaign. Picking an item fills the usual "new entry" form with
//! its stats, so the player checks or adjusts them before saving; the sheet
//! keeps its own copy.

use dioxus::prelude::*;
use serde::Deserialize;
use serde_json::Value;
use traveller_model::catalogue::{BOOKS, CatalogueItem, range_text};
use traveller_rules::Credits;

use super::{fresh_session, use_session};
use crate::supabase::{self, Error};

/// Which sheet list the picker fills, which decides what it searches.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Pick {
    Weapon,
    Armour,
    Gear,
    Augment,
    /// The campaign's shared locker: any gear, weapon or armour.
    Locker,
}

impl Pick {
    /// The catalogue kinds to search.
    fn kinds(self) -> &'static str {
        match self {
            Self::Weapon => "weapon",
            Self::Armour => "armour",
            Self::Gear => "gear,software",
            Self::Augment => "augment",
            Self::Locker => "weapon,armour,gear,software",
        }
    }

    /// The item as the list stores it.
    pub fn convert(self, item: &CatalogueItem) -> Value {
        let value = match self {
            Self::Weapon => serde_json::to_value(item.to_weapon()),
            Self::Armour => serde_json::to_value(item.to_armour()),
            Self::Gear => serde_json::to_value(item.to_item()),
            Self::Augment => serde_json::to_value(item.to_augment()),
            Self::Locker => {
                let gear = item.to_item();
                Ok(serde_json::json!({ "name": gear.name, "quantity": 1, "notes": gear.notes }))
            }
        };
        value.unwrap_or(Value::Null)
    }
}

/// The search query for `term` in `books` (ids).
fn search_path(pick: Pick, term: &str, books: &[&str]) -> String {
    format!(
        "catalogue_items?select=item&kind=in.({})&book=in.({})&name=ilike.*{}*&order=name.asc,tl.asc&limit=40",
        pick.kinds(),
        books.join(","),
        supabase::encode(term.trim())
    )
}

#[derive(Deserialize)]
struct Row {
    item: CatalogueItem,
}

/// One line about a result: its key stats.
fn describe(pick: Pick, item: &CatalogueItem) -> String {
    let mut parts = Vec::new();
    if let Some(tl) = item.tl {
        parts.push(format!("TL{tl}"));
    }
    match pick {
        Pick::Weapon => {
            if let Some(w) = &item.weapon {
                if !w.damage.is_empty() {
                    parts.push(w.damage.clone());
                }
                if !w.range.is_empty() {
                    parts.push(range_text(&w.range));
                }
            }
        }
        Pick::Armour => {
            if let Some(a) = &item.armour {
                parts.push(a.protection.clone());
            }
        }
        Pick::Gear | Pick::Augment | Pick::Locker => {}
    }
    if let Some(cost) = item.cost {
        parts.push(Credits(cost).to_string());
    }
    parts.push(item.reference());
    parts.join(" · ")
}

/// Search the catalogue and pick an item. `on_pick` gets it as the list
/// stores it, and its catalogue price.
#[component]
pub fn CataloguePicker(
    pick: Pick,
    on_pick: EventHandler<(Value, Option<i64>)>,
    on_close: EventHandler<()>,
) -> Element {
    let session = use_session();
    let mut term = use_signal(String::new);
    // Which books to search (ids); all of them to start with.
    let mut books = use_signal(|| BOOKS.iter().map(|(id, _)| *id).collect::<Vec<_>>());

    let results = use_resource(move || async move {
        let term = term();
        let books = books();
        if term.trim().chars().count() < 2 || books.is_empty() {
            return Ok(None);
        }
        let current = fresh_session(session).await?;
        let rows: Vec<Row> = supabase::get(&current, &search_path(pick, &term, &books)).await?;
        Ok::<_, Error>(Some(rows.into_iter().map(|r| r.item).collect::<Vec<_>>()))
    });

    rsx! {
        div { class: "edit-form picker",
            h3 { "From the catalogue" }
            div { class: "field",
                label { r#for: "pick-{pick:?}", "Search by name" }
                input { id: "pick-{pick:?}", r#type: "search", autocomplete: "off", maxlength: "60",
                    placeholder: "e.g. rifle, vacc suit, medikit",
                    value: "{term}", oninput: move |e| term.set(e.value()) }
            }
            fieldset { class: "books",
                legend { "Books" }
                for (id, short) in BOOKS.iter().copied() {
                    label { key: "{id}", class: "check",
                        input { r#type: "checkbox", checked: books.read().contains(&id),
                            onchange: move |e| {
                                let mut chosen = books.write();
                                chosen.retain(|b| *b != id);
                                if e.checked() {
                                    chosen.push(id);
                                }
                            }
                        }
                        "{short}"
                    }
                }
            }
            match &*results.read() {
                None => rsx! { p { class: "muted small", "Searching…" } },
                Some(Ok(None)) if books.read().is_empty() => rsx! {
                    p { class: "muted small", "Tick at least one book." }
                },
                Some(Ok(None)) => rsx! { p { class: "muted small", "Type at least two letters." } },
                Some(Ok(Some(items))) if items.is_empty() => rsx! {
                    p { class: "muted small",
                        "Nothing matches. The catalogue is open to campaign members, once your referee has loaded it."
                    }
                },
                Some(Ok(Some(items))) => rsx! {
                    ul { class: "pick-list",
                        for item in items.iter().cloned() {
                            li { key: "{item.id}",
                                button { class: "pick", r#type: "button",
                                    onclick: move |_| on_pick.call((pick.convert(&item), item.cost)),
                                    strong { "{item.name}" }
                                    span { class: "muted small", {describe(pick, &item)} }
                                }
                            }
                        }
                    }
                },
                Some(Err(Error::Unavailable)) => rsx! {
                    p { class: "error", role: "alert", "The catalogue isn't set up on this server yet." }
                },
                Some(Err(e)) => rsx! { p { class: "error", role: "alert", "{e}" } },
            }
            button { class: "btn outline", r#type: "button", onclick: move |_| on_close.call(()), "Close" }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::BTreeMap;
    use traveller_model::catalogue::{ItemKind, WeaponStats};

    fn rifle() -> CatalogueItem {
        CatalogueItem {
            id: "csc-2023/gauss-rifle-tl12".into(),
            book: "csc-2023".into(),
            page: 145,
            section: "Weaponry".into(),
            kind: ItemKind::Weapon,
            name: "Gauss Rifle".into(),
            tl: Some(12),
            cost: Some(1500),
            kg: Some(4.0),
            weapon: Some(WeaponStats {
                range: "600".into(),
                damage: "4D".into(),
                magazine: Some(80),
                magazine_cost: Some(80),
                traits: vec!["AP 5".into()],
            }),
            armour: None,
            effect: String::new(),
            columns: BTreeMap::new(),
        }
    }

    #[test]
    fn searches_by_kind_and_encoded_name() {
        assert_eq!(
            search_path(Pick::Gear, " vacc suit ", &["csc-2023"]),
            "catalogue_items?select=item&kind=in.(gear,software)&book=in.(csc-2023)&name=ilike.*vacc%20suit*&order=name.asc,tl.asc&limit=40"
        );
    }

    #[test]
    fn describes_and_converts_a_weapon() {
        let item = rifle();
        assert_eq!(
            describe(Pick::Weapon, &item),
            "TL12 · 4D · 600m · Cr1,500 · CSC p.145"
        );
        let value = Pick::Weapon.convert(&item);
        assert_eq!(value["rounds"], 80);
        assert_eq!(value["traits"], "AP 5");
    }
}
