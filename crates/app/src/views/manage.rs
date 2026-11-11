//! Creating and deleting characters.

use dioxus::prelude::*;
use traveller_model::character::Stat;
use traveller_model::{CharacterRow, Characteristics};
use traveller_rules::Characteristic;

use super::editor::use_editor;
use super::{CHARACTER_COLUMNS, fresh_session, use_session};
use crate::Route;
use crate::supabase;

/// Turns the six entered scores into stored characteristics, or explains
/// what's wrong.
fn characteristics_from(values: &[String]) -> Result<Characteristics, String> {
    let mut scores = [0_i32; 6];
    for ((c, raw), slot) in Characteristic::ALL
        .iter()
        .zip(values)
        .zip(scores.iter_mut())
    {
        *slot = raw
            .trim()
            .parse::<i32>()
            .ok()
            .filter(|n| (0..=33).contains(n))
            .ok_or_else(|| format!("{c} must be a whole number from 0 to 33."))?;
    }
    let stat = |value| Stat {
        value,
        current: None,
        xp: 0,
    };
    Ok(Characteristics {
        str: stat(scores[0]),
        dex: stat(scores[1]),
        end: stat(scores[2]),
        int: stat(scores[3]),
        edu: stat(scores[4]),
        soc: stat(scores[5]),
    })
}

/// A form to create a character; opens it on success.
#[component]
pub fn NewCharacter(on_cancel: EventHandler<()>) -> Element {
    let session = use_session();
    let navigator = use_navigator();
    let mut name = use_signal(String::new);
    let mut scores = use_signal(|| vec![String::from("7"); 6]);
    let mut error = use_signal(|| None::<String>);
    let mut busy = use_signal(|| false);

    let create = move |evt: FormEvent| {
        evt.prevent_default();
        let trimmed = name().trim().to_string();
        if trimmed.is_empty() || trimmed.chars().count() > 120 {
            error.set(Some(
                "Give the character a name (up to 120 characters).".into(),
            ));
            return;
        }
        let characteristics = match characteristics_from(&scores.read()) {
            Ok(c) => c,
            Err(message) => {
                error.set(Some(message));
                return;
            }
        };
        busy.set(true);
        error.set(None);
        spawn(async move {
            let result = async {
                let current = fresh_session(session).await?;
                let body = serde_json::json!({
                    "name": trimmed,
                    "character_name": trimmed,
                    "owner_id": current.user_id,
                    "characteristics": characteristics,
                });
                let rows: Vec<CharacterRow> = supabase::post(
                    &current,
                    &format!("characters?select={CHARACTER_COLUMNS}"),
                    &body,
                )
                .await?;
                rows.into_iter().next().ok_or(supabase::Error::Server)
            }
            .await;
            busy.set(false);
            match result {
                Ok(row) => {
                    navigator.push(Route::Character { id: row.id });
                }
                Err(e) => error.set(Some(e.to_string())),
            }
        });
    };

    rsx! {
        form { class: "edit-form new-character", onsubmit: create,
            h2 { class: "section", "New character" }
            div { class: "field wide",
                label { r#for: "new-name", "Name" }
                input { id: "new-name", r#type: "text", maxlength: "120", required: true,
                    value: "{name}", oninput: move |e| name.set(e.value()) }
            }
            p { class: "muted small", "Characteristics as rolled (2D each). You can change them later." }
            div { class: "stat-inputs",
                for (i, c) in Characteristic::ALL.iter().enumerate() {
                    div { key: "{c}", class: "field",
                        label { r#for: "new-{c}", "{c}" }
                        input { id: "new-{c}", r#type: "text", inputmode: "numeric",
                            value: "{scores.read()[i]}",
                            oninput: move |e| scores.write()[i] = e.value() }
                    }
                }
            }
            if let Some(message) = error() {
                p { class: "error", role: "alert", "{message}" }
            }
            div { class: "inline",
                button { class: "btn", r#type: "submit", disabled: busy(),
                    if busy() { "Creating…" } else { "Create character" }
                }
                button { class: "btn outline", r#type: "button", onclick: move |_| on_cancel.call(()), "Cancel" }
            }
        }
    }
}

/// Deleting a character, confirmed by typing its name.
#[component]
pub fn DeleteCharacter(name: String) -> Element {
    let editor = use_editor();
    let navigator = use_navigator();
    let mut typed = use_signal(String::new);
    let mut error = use_signal(|| None::<String>);
    let mut busy = use_signal(|| false);
    let matches = typed().trim() == name.trim();

    let delete = move |evt: FormEvent| {
        evt.prevent_default();
        if !matches {
            return;
        }
        busy.set(true);
        spawn(async move {
            let result = async {
                let current = fresh_session(editor.session).await?;
                let id = editor.character_id.peek().clone();
                supabase::delete(&current, &format!("characters?id=eq.{id}")).await
            }
            .await;
            busy.set(false);
            match result {
                Ok(n) if n > 0 => {
                    navigator.push(Route::Characters {});
                }
                Ok(_) => error.set(Some("Only the character's player can delete it.".into())),
                Err(e) => error.set(Some(e.to_string())),
            }
        });
    };

    rsx! {
        section { class: "edit-section danger", aria_labelledby: "delete-char",
            h2 { id: "delete-char", class: "section", "Delete character" }
            p { "This removes {name} and their whole sheet. It can't be undone." }
            form { class: "edit-form", onsubmit: delete,
                div { class: "field wide",
                    label { r#for: "confirm-name", "Type the character's name to confirm" }
                    input { id: "confirm-name", r#type: "text", autocomplete: "off",
                        value: "{typed}", oninput: move |e| typed.set(e.value()) }
                }
                if let Some(message) = error() {
                    p { class: "error", role: "alert", "{message}" }
                }
                button { class: "btn", r#type: "submit", disabled: !matches || busy(),
                    if busy() { "Deleting…" } else { "Delete character" }
                }
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn builds_characteristics_from_scores() {
        let values: Vec<String> = ["7", "10", "8", "9", "7", "7"].map(String::from).to_vec();
        let c = characteristics_from(&values).unwrap();
        assert_eq!(c.upp(), "7A8977");
        assert_eq!(c.end.current, None);
    }

    #[test]
    fn rejects_bad_scores() {
        let values: Vec<String> = ["7", "x", "8", "9", "7", "7"].map(String::from).to_vec();
        assert!(
            characteristics_from(&values)
                .unwrap_err()
                .starts_with("DEX")
        );
        let values: Vec<String> = ["7", "7", "34", "9", "7", "7"].map(String::from).to_vec();
        assert!(
            characteristics_from(&values)
                .unwrap_err()
                .starts_with("END")
        );
    }
}
