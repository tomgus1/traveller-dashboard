//! Edit forms, for any document: a character sheet or a campaign's state.
//!
//! A list editor (add, edit, remove) and a section editor, driven by the
//! field lists in `fields.rs`. They turn the form into a [`DocChange`] and
//! hand it to the page's [`DocEditor`], which applies and saves it. Keys a
//! form doesn't know about are left alone.

use dioxus::prelude::*;
use serde_json::Value;
use traveller_rules::Characteristic;

use super::catalogue::{CataloguePicker, Pick};
use super::doc::{DocChange, Target, at, new_id, use_doc};
use super::editor::use_editor;
use super::fields::{
    Field, Kind, MAX_LONG, MAX_TEXT, Suggest, blank, collect, summary, to_text, whole,
};

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
                                Kind::Text if field.suggest != Suggest::None => rsx! {
                                    label { r#for: "{input_id}", "{field.label}" }
                                    input { id: "{input_id}", r#type: "text", maxlength: "{MAX_TEXT}", value: "{value}",
                                        required: field.required, autocomplete: "off",
                                        list: "{input_id}-options", placeholder: "Start typing to search",
                                        oninput: move |e| values.write()[i] = e.value() }
                                    datalist { id: "{input_id}-options",
                                        for option in field.suggest.options() {
                                            option { key: "{option}", value: "{option}" }
                                        }
                                    }
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

/// The target for an existing item: its id if it has one, else position.
fn target_of(item: &Value, index: usize) -> Target {
    match item.get("id").and_then(Value::as_str) {
        Some(id) if !id.is_empty() => Target::Id(id.to_string()),
        _ => Target::Index(index),
    }
}

#[derive(Clone, PartialEq)]
enum Editing {
    New,
    Item(Target),
}

/// Add, edit and remove the items of one list.
#[component]
pub fn ListEditor(
    /// Dotted path to the list, e.g. "weapons" or "travel.journal".
    path: &'static str,
    title: &'static str,
    fields: &'static [Field],
    /// Give new items an id (shared lists, where several people edit).
    #[props(default)]
    ids: bool,
    /// Offer picking new items from the rulebook catalogue.
    #[props(default)]
    catalogue: Option<Pick>,
) -> Element {
    let doc = use_doc();
    let mut editing = use_signal(|| None::<Editing>);
    let mut picking = use_signal(|| false);
    let mut values = use_signal(Vec::<String>::new);
    let mut error = use_signal(|| None::<String>);
    let mut confirm_remove = use_signal(|| None::<usize>);
    let busy = (doc.saving)();

    let items: Vec<Value> = at(&doc.doc.read(), path)
        .and_then(Value::as_array)
        .cloned()
        .unwrap_or_default();

    let save = move |evt: FormEvent| {
        evt.prevent_default();
        let Some(which) = editing() else { return };
        let fields_map = match collect(fields, &values.read()) {
            Ok(map) => map,
            Err(message) => {
                error.set(Some(message));
                return;
            }
        };
        let target = match which {
            Editing::New => Target::New(if ids { new_id() } else { String::new() }),
            Editing::Item(t) => t,
        };
        doc.change.call((
            DocChange::Upsert {
                path,
                target,
                fields: fields_map,
            },
            "Saved.",
        ));
        editing.set(None);
    };

    let form_id = path.replace('.', "-");
    rsx! {
        section { class: "edit-section", aria_labelledby: "edit-{form_id}",
            div { class: "edit-head",
                h2 { id: "edit-{form_id}", class: "section", "{title}" }
                if editing().is_none() && !picking() {
                    span { class: "row-actions",
                        if catalogue.is_some() {
                            button { class: "mini outline", r#type: "button", disabled: busy,
                                onclick: move |_| {
                                    confirm_remove.set(None);
                                    picking.set(true);
                                },
                                "From catalogue"
                            }
                        }
                        button { class: "mini", r#type: "button", disabled: busy,
                            onclick: move |_| {
                                values.set(blank(fields));
                                error.set(None);
                                confirm_remove.set(None);
                                editing.set(Some(Editing::New));
                            },
                            "Add"
                        }
                    }
                }
            }

            if let (Some(pick), true) = (catalogue, picking()) {
                CataloguePicker { pick,
                    on_pick: move |item: Value| {
                        values.set(fields.iter().map(|f| to_text(item.get(f.key))).collect());
                        error.set(None);
                        picking.set(false);
                        editing.set(Some(Editing::New));
                    },
                    on_close: move |()| picking.set(false),
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
                        {
                            let target = target_of(item, i);
                            let for_edit = item.clone();
                            let edit_target = target.clone();
                            rsx! {
                                li { key: "{i}",
                                    span { class: "edit-summary", {summary(fields, item)} }
                                    if confirm_remove() == Some(i) {
                                        span { class: "row-actions",
                                            button { class: "mini", r#type: "button", disabled: busy,
                                                onclick: move |_| {
                                                    doc.change.call((DocChange::Remove { path, target: target.clone() }, "Removed."));
                                                    confirm_remove.set(None);
                                                    editing.set(None);
                                                },
                                                "Confirm remove"
                                            }
                                            button { class: "mini outline", r#type: "button",
                                                onclick: move |_| confirm_remove.set(None), "Keep" }
                                        }
                                    } else {
                                        span { class: "row-actions",
                                            button { class: "mini outline", r#type: "button", disabled: busy,
                                                onclick: move |_| {
                                                    values.set(fields.iter().map(|f| to_text(for_edit.get(f.key))).collect());
                                                    error.set(None);
                                                    confirm_remove.set(None);
                                                    editing.set(Some(Editing::Item(edit_target.clone())));
                                                },
                                                "Edit"
                                            }
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
    }
}

/// Edits fields of one part of the document in place ("" is the top level).
#[component]
pub fn SectionEditor(path: &'static str, title: &'static str, fields: &'static [Field]) -> Element {
    let doc = use_doc();
    let initial = {
        let json = doc.doc.read();
        let object = at(&json, path).cloned().unwrap_or(Value::Null);
        fields
            .iter()
            .map(|f| to_text(object.get(f.key)))
            .collect::<Vec<_>>()
    };
    let values = use_signal(|| initial);
    let mut error = use_signal(|| None::<String>);
    let busy = (doc.saving)();

    let save = move |evt: FormEvent| {
        evt.prevent_default();
        match collect(fields, &values.read()) {
            Ok(map) => {
                error.set(None);
                doc.change
                    .call((DocChange::Set { path, fields: map }, "Saved."));
            }
            Err(message) => error.set(Some(message)),
        }
    };

    let form_id = if path.is_empty() {
        format!("top-{}", title.to_lowercase().replace(' ', "-"))
    } else {
        path.replace('.', "-")
    };
    rsx! {
        section { class: "edit-section", aria_labelledby: "edit-{form_id}",
            h2 { id: "edit-{form_id}", class: "section", "{title}" }
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

/// Edits the maximum of each characteristic (on the `characters` row).
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
