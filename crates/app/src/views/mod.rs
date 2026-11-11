//! Pages and the app shell.

mod editor;
mod forms;
mod manage;
mod sheet;

pub use sheet::Character;

use dioxus::prelude::*;

use crate::Route;
use crate::session::{self, Session};
use crate::supabase::{self, Error};
use traveller_model::CharacterRow;

/// The shared session signal.
pub(crate) fn use_session() -> Signal<Option<Session>> {
    use_context()
}

/// The current session, refreshed if it's about to expire. Signs the user
/// out if it can't be refreshed.
pub(crate) async fn fresh_session(mut signal: Signal<Option<Session>>) -> Result<Session, Error> {
    let current = signal.peek().clone().ok_or(Error::SessionExpired)?;
    match supabase::ensure_fresh(&current).await {
        Ok(fresh) => {
            if fresh != current {
                session::save(Some(&fresh));
                signal.set(Some(fresh.clone()));
            }
            Ok(fresh)
        }
        Err(Error::SessionExpired) => {
            session::save(None);
            signal.set(None);
            Err(Error::SessionExpired)
        }
        Err(other) => Err(other),
    }
}

/// Header, navigation and page; the sign-in form when signed out.
#[component]
pub fn Shell() -> Element {
    let mut session = use_session();
    let Some(current) = session() else {
        return rsx! { SignIn {} };
    };

    let sign_out = move |_| {
        let current = current.clone();
        spawn(async move {
            supabase::sign_out(&current).await;
            session::save(None);
            session.set(None);
        });
    };

    rsx! {
        header { class: "top",
            span { class: "brand", "Traveller Dashboard" }
            nav { class: "nav", aria_label: "Main",
                Link { to: Route::Home {}, active_class: "active", "Home" }
                Link { to: Route::Characters {}, active_class: "active", "Characters" }
            }
            button { class: "top-action", r#type: "button", onclick: sign_out, "Sign out" }
        }
        Outlet::<Route> {}
    }
}

/// Email and password sign-in.
#[component]
fn SignIn() -> Element {
    let mut session = use_session();
    let mut email = use_signal(String::new);
    let mut password = use_signal(String::new);
    let mut error = use_signal(|| None::<String>);
    let mut busy = use_signal(|| false);

    let submit = move |evt: FormEvent| {
        evt.prevent_default();
        spawn(async move {
            busy.set(true);
            error.set(None);
            match supabase::sign_in(&email(), &password()).await {
                Ok(new_session) => {
                    session::save(Some(&new_session));
                    session.set(Some(new_session));
                }
                Err(e) => error.set(Some(e.to_string())),
            }
            busy.set(false);
        });
    };

    rsx! {
        main { class: "page narrow",
            h1 { class: "display", "Sign in" }
            p { class: "muted", "Traveller Dashboard keeps your characters and campaigns in one place." }
            form { class: "form", onsubmit: submit,
                label { r#for: "email", "Email" }
                input {
                    id: "email", r#type: "email", autocomplete: "email", required: true,
                    value: "{email}", oninput: move |e| email.set(e.value()),
                }
                label { r#for: "password", "Password" }
                input {
                    id: "password", r#type: "password", autocomplete: "current-password", required: true,
                    value: "{password}", oninput: move |e| password.set(e.value()),
                }
                if let Some(message) = error() {
                    p { class: "error", role: "alert", "{message}" }
                }
                button { class: "btn", r#type: "submit", disabled: busy(),
                    if busy() { "Signing in…" } else { "Sign in" }
                }
            }
        }
    }
}

/// Landing page.
#[component]
pub fn Home() -> Element {
    let session = use_session();
    let email = session().map(|s| s.email).unwrap_or_default();
    rsx! {
        main { class: "page",
            EdgeTab { label: "Home" }
            h1 { class: "display", "Welcome back" }
            p { class: "muted", "Signed in as {email}." }
            p { Link { to: Route::Characters {}, "Your characters" } }
        }
    }
}

/// The section name down the page edge, as on the rulebook pages.
#[component]
pub(crate) fn EdgeTab(label: &'static str) -> Element {
    rsx! {
        div { class: "edge-tab", aria_hidden: "true", span { "{label}" } }
    }
}

/// Columns for [`CharacterRow`]; must include `owner_id`, which decides
/// who can edit.
pub(crate) const CHARACTER_COLUMNS: &str = CharacterRow::COLUMNS;

/// The characters the signed-in user can see.
#[component]
pub fn Characters() -> Element {
    let session = use_session();
    let mut creating = use_signal(|| false);
    let characters = use_resource(move || async move {
        let current = fresh_session(session).await?;
        supabase::get::<Vec<CharacterRow>>(
            &current,
            &format!("characters?select={CHARACTER_COLUMNS}&order=name"),
        )
        .await
    });

    rsx! {
        main { class: "page",
            EdgeTab { label: "Characters" }
            div { class: "page-head",
                h1 { class: "display", "Characters" }
                if !creating() {
                    button { class: "btn", r#type: "button", onclick: move |_| creating.set(true), "New character" }
                }
            }
            if creating() {
                manage::NewCharacter { on_cancel: move |()| creating.set(false) }
            }
            match &*characters.read() {
                None => rsx! { p { class: "muted", "Loading…" } },
                Some(Err(e)) => rsx! { p { class: "error", role: "alert", "{e}" } },
                Some(Ok(rows)) if rows.is_empty() => rsx! {
                    p { class: "muted", "No characters yet." }
                },
                Some(Ok(rows)) => rsx! {
                    table { class: "data",
                        thead { tr {
                            th { scope: "col", "Traveller" }
                            th { scope: "col", "UPP" }
                            th { scope: "col", "Campaign" }
                        } }
                        tbody {
                            for row in rows.iter() {
                                tr { key: "{row.id}",
                                    td { Link { to: Route::Character { id: row.id.clone() }, class: "strong", "{row.display_name()}" } }
                                    td { class: "upp", {row.characteristics.unwrap_or_default().upp()} }
                                    td { class: "muted",
                                        if row.campaign_id.is_some() { "In a campaign" } else { "Not in a campaign" }
                                    }
                                }
                            }
                        }
                    }
                },
            }
        }
    }
}

/// Database ids are UUIDs; anything else is rejected before it reaches a
/// query string.
pub(crate) fn is_uuid(id: &str) -> bool {
    id.len() == 36 && id.chars().all(|c| c.is_ascii_hexdigit() || c == '-')
}

/// Unknown addresses.
#[component]
pub fn NotFound(segments: Vec<String>) -> Element {
    let _ = segments;
    rsx! {
        main { class: "page",
            h1 { class: "display", "Page not found" }
            p { Link { to: Route::Home {}, "Go to Home" } }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn only_uuids_reach_queries() {
        assert!(is_uuid("0b1c6c1e-6a6f-4a5e-9f3a-2d1f5e8b9c70"));
        assert!(!is_uuid("1&select=password"));
        assert!(!is_uuid("0b1c6c1e-6a6f-4a5e-9f3a-2d1f5e8b9c7&"));
    }
}
