//! Editing a character: saving, conflict handling, and the quick actions
//! used at the table.
//!
//! Only a character's owner edits it (the database enforces this; referees
//! read). The sheet document saves only if it hasn't changed since it was
//! loaded (`updated_at` must still match), so the same player editing on two
//! devices, say a phone at the table and a laptop, can't silently overwrite
//! one edit with the other: the second save is refused and the page reloads.

use std::fmt::Write as _;

use dioxus::prelude::*;
use serde::Deserialize;
use traveller_model::{CharacterSheet, Characteristics};
use traveller_rules::characteristics::{Condition, Overflow};
use traveller_rules::{Characteristic, Credits};

use super::fresh_session;
use crate::session::Session;
use crate::supabase::{self, Error};

/// A message shown above the sheet after an action.
#[derive(Clone, PartialEq)]
pub struct Notice {
    pub text: String,
    pub is_error: bool,
}

/// Shared editing state for one character's page.
#[derive(Clone, Copy, PartialEq)]
pub struct Editor {
    pub session: Signal<Option<Session>>,
    pub character_id: Signal<String>,
    pub sheet: Signal<CharacterSheet>,
    /// The sheet's `updated_at` when loaded or last saved.
    pub version: Signal<Option<String>>,
    pub stats: Signal<Characteristics>,
    pub notice: Signal<Option<Notice>>,
    pub saving: Signal<bool>,
    /// Asks the page to load everything again.
    pub reload: Callback<()>,
}

#[derive(Deserialize)]
struct Saved {
    updated_at: String,
}

impl Editor {
    fn say(mut self, text: impl Into<String>, is_error: bool) {
        self.notice.set(Some(Notice {
            text: text.into(),
            is_error,
        }));
    }

    /// Applies `change` to the sheet and saves it. The page updates at once;
    /// if the save fails, the change is undone and the reason shown.
    pub fn update_sheet(mut self, done: &'static str, change: impl FnOnce(&mut CharacterSheet)) {
        if (self.saving)() {
            return;
        }
        let before = self.sheet.peek().clone();
        let mut after = before.clone();
        change(&mut after);
        if after == before {
            return;
        }
        self.sheet.set(after.clone());
        self.saving.set(true);

        spawn(async move {
            let result = self.save_sheet(&after).await;
            self.saving.set(false);
            match result {
                Ok(()) => self.say(done, false),
                Err(SaveError::Conflict) => {
                    self.say(
                        "This sheet was changed elsewhere (another device?). It has been reloaded; please try again.",
                        true,
                    );
                    self.reload.call(());
                }
                Err(SaveError::Other(e)) => {
                    self.sheet.set(before);
                    self.say(e.to_string(), true);
                }
            }
        });
    }

    async fn save_sheet(mut self, sheet: &CharacterSheet) -> Result<(), SaveError> {
        let current = fresh_session(self.session).await?;
        let id = self.character_id.peek().clone();
        let mut path = format!("character_sheets?character_id=eq.{id}&select=updated_at");
        if let Some(version) = self.version.peek().as_deref() {
            let _ = write!(path, "&updated_at=eq.{}", supabase::encode(version));
        }
        let body = serde_json::json!({ "data": sheet });
        let saved: Vec<Saved> = supabase::patch(&current, &path, &body).await?;
        let row = saved.into_iter().next().ok_or(SaveError::Conflict)?;
        self.version.set(Some(row.updated_at));
        Ok(())
    }

    /// Saves characteristics (on the `characters` row). Only the owner can.
    pub fn update_stats(mut self, done: &'static str, change: impl FnOnce(&mut Characteristics)) {
        if (self.saving)() {
            return;
        }
        let before = *self.stats.peek();
        let mut after = before;
        change(&mut after);
        if after == before {
            return;
        }
        self.stats.set(after);
        self.saving.set(true);

        spawn(async move {
            let result: Result<(), Error> = async {
                let current = fresh_session(self.session).await?;
                let id = self.character_id.peek().clone();
                let rows: Vec<serde_json::Value> = supabase::patch(
                    &current,
                    &format!("characters?id=eq.{id}&select=id"),
                    &serde_json::json!({ "characteristics": after }),
                )
                .await?;
                if rows.is_empty() {
                    Err(Error::Server)
                } else {
                    Ok(())
                }
            }
            .await;
            self.saving.set(false);
            match result {
                Ok(()) => self.say(done, false),
                Err(Error::Server) => {
                    self.stats.set(before);
                    self.say(
                        "Only the character's player can change characteristics.",
                        true,
                    );
                }
                Err(e) => {
                    self.stats.set(before);
                    self.say(e.to_string(), true);
                }
            }
        });
    }
}

enum SaveError {
    Conflict,
    Other(Error),
}

impl From<Error> for SaveError {
    fn from(e: Error) -> Self {
        Self::Other(e)
    }
}

/// The editor for the current character page.
pub fn use_editor() -> Editor {
    use_context()
}

/// The result of the last action, if any.
#[component]
pub fn NoticeBar() -> Element {
    let editor = use_editor();
    let mut notice = editor.notice;
    let Some(n) = notice() else {
        return rsx! {};
    };
    rsx! {
        div { class: if n.is_error { "notice error-notice" } else { "notice ok-notice" },
            role: if n.is_error { "alert" } else { "status" },
            span { "{n.text}" }
            button { class: "link-button", r#type: "button", aria_label: "Dismiss",
                onclick: move |_| notice.set(None),
                "\u{00d7}"
            }
        }
    }
}

/// Fire and reload buttons for a weapon with a magazine.
#[component]
pub fn WeaponButtons(index: usize) -> Element {
    let editor = use_editor();
    let sheet = editor.sheet.read();
    let Some(weapon) = sheet.weapons.get(index) else {
        return rsx! {};
    };
    if weapon.magazine.is_none() {
        return rsx! {};
    }
    let can_fire = weapon.rounds.is_some_and(|r| r > 0);
    let can_reload = weapon.spare_magazines > 0;
    let name = weapon.name.clone();
    let busy = (editor.saving)();

    rsx! {
        div { class: "row-actions",
            button {
                class: "mini",
                r#type: "button",
                disabled: !can_fire || busy,
                aria_label: "Fire one round from {name}",
                onclick: move |_| editor.update_sheet("Fired one round.", move |s| {
                    if let Some(w) = s.weapons.get_mut(index) {
                        w.fire();
                    }
                }),
                "Fire"
            }
            button {
                class: "mini outline",
                r#type: "button",
                disabled: !can_reload || busy,
                aria_label: "Reload {name}",
                onclick: move |_| editor.update_sheet("Reloaded.", move |s| {
                    if let Some(w) = s.weapons.get_mut(index) {
                        w.reload();
                    }
                }),
                "Reload"
            }
        }
    }
}

const PHYSICAL: [Characteristic; 3] = [
    Characteristic::Str,
    Characteristic::Dex,
    Characteristic::End,
];

/// Damage, healing and credits: the things that change mid-session.
#[component]
pub fn QuickActions() -> Element {
    let editor = use_editor();
    let mut damage = use_signal(String::new);
    let mut overflow = use_signal(|| Overflow::Str);
    let mut amount = use_signal(String::new);
    let mut entry = use_signal(String::new);
    let busy = (editor.saving)();
    let stats = (editor.stats)();
    let injured = PHYSICAL.iter().any(|&c| stats.get(c).is_reduced());

    let apply_damage = move |evt: FormEvent| {
        evt.prevent_default();
        let Ok(points) = damage().trim().parse::<i32>() else {
            editor.say(
                "Enter the damage that got through armour, as a number.",
                true,
            );
            return;
        };
        let overflow = overflow();
        editor.update_stats(damage_message(points), move |c| {
            let mut physical = c.physical();
            physical.apply_damage(points, overflow);
            c.set_physical(physical);
        });
        damage.set(String::new());
    };

    let money = use_callback(move |sign: i64| {
        let Some(value) = parse_credits(&amount()) else {
            editor.say("Enter an amount in credits, e.g. 1500.", true);
            return;
        };
        let description = entry().trim().to_string();
        let description = if description.is_empty() {
            if sign < 0 { "Spent" } else { "Received" }.to_string()
        } else {
            description
        };
        editor.update_sheet("Ledger updated.", move |s| {
            s.finances
                .record(today(), description, Credits(value * sign));
        });
        amount.set(String::new());
        entry.set(String::new());
    });

    rsx! {
        section { class: "quick", aria_labelledby: "quick",
            h2 { id: "quick", class: "section", "At the table" }
            div { class: "quick-grid",
                form { class: "quick-box", onsubmit: apply_damage,
                    h3 { "Take damage" }
                    p { class: "muted small", "After armour. END first, then your choice of STR or DEX (Core p.77)." }
                    div { class: "inline",
                        label { class: "sr-only", r#for: "dmg", "Damage points" }
                        input { id: "dmg", r#type: "number", inputmode: "numeric", min: "0", placeholder: "Points",
                            value: "{damage}", oninput: move |e| damage.set(e.value()) }
                        label { class: "sr-only", r#for: "overflow", "Excess damage goes to" }
                        select { id: "overflow",
                            onchange: move |e| overflow.set(if e.value() == "dex" { Overflow::Dex } else { Overflow::Str }),
                            option { value: "str", selected: overflow() == Overflow::Str, "Then STR" }
                            option { value: "dex", selected: overflow() == Overflow::Dex, "Then DEX" }
                        }
                        button { class: "btn", r#type: "submit", disabled: busy, "Apply" }
                    }
                }

                div { class: "quick-box",
                    h3 { "Heal" }
                    if injured {
                        div { class: "inline wrap",
                            for c in PHYSICAL {
                                if stats.get(c).is_reduced() {
                                    button { key: "{c}", class: "mini outline", r#type: "button", disabled: busy,
                                        aria_label: "Restore one point of {c}",
                                        onclick: move |_| editor.update_stats("Healed one point.", move |s| heal(s, c, 1)),
                                        "+1 {c}"
                                    }
                                }
                            }
                            button { class: "mini", r#type: "button", disabled: busy,
                                onclick: move |_| editor.update_stats("Fully healed.", |s| {
                                    for c in PHYSICAL { heal(s, c, i32::MAX); }
                                }),
                                "Fully healed"
                            }
                        }
                        p { class: "muted small", "Healing rates: first aid, medical care and rest (Core p.82–83)." }
                    } else {
                        p { class: "muted", "No damage." }
                    }
                }

                form { class: "quick-box", onsubmit: move |e: FormEvent| { e.prevent_default(); money.call(-1); },
                    h3 { "Credits" }
                    p { class: "muted small", "Cash on hand: ", strong { {Credits(editor.sheet.read().finances.cash).to_string()} } }
                    div { class: "inline wrap",
                        label { class: "sr-only", r#for: "cr", "Amount in credits" }
                        input { id: "cr", r#type: "text", inputmode: "numeric", placeholder: "Cr",
                            value: "{amount}", oninput: move |e| amount.set(e.value()) }
                        label { class: "sr-only", r#for: "cr-what", "What for" }
                        input { id: "cr-what", r#type: "text", placeholder: "What for", maxlength: "120",
                            value: "{entry}", oninput: move |e| entry.set(e.value()) }
                    }
                    div { class: "inline",
                        button { class: "btn", r#type: "submit", disabled: busy, "Spend" }
                        button { class: "btn outline", r#type: "button", disabled: busy, onclick: move |_| money.call(1), "Receive" }
                    }
                }
            }
        }
    }
}

fn damage_message(points: i32) -> &'static str {
    if points == 0 {
        "No damage taken."
    } else {
        "Damage applied."
    }
}

/// Restores up to `points` to one characteristic, never above its maximum.
fn heal(stats: &mut Characteristics, c: Characteristic, points: i32) {
    let stat = match c {
        Characteristic::Str => &mut stats.str,
        Characteristic::Dex => &mut stats.dex,
        Characteristic::End => &mut stats.end,
        _ => return,
    };
    let healed = stat.current().saturating_add(points).min(stat.value);
    stat.current = (healed < stat.value).then_some(healed);
}

/// "1,500", "Cr1500", "1500" → 1500. Positive whole credits only.
fn parse_credits(text: &str) -> Option<i64> {
    let digits: String = text
        .trim()
        .trim_start_matches("Cr")
        .trim_start_matches("cr")
        .chars()
        .filter(|c| *c != ',' && !c.is_whitespace())
        .collect();
    digits.parse::<i64>().ok().filter(|v| *v > 0)
}

/// Today's date for ledger entries (the campaign's Imperial date comes
/// with the campaign screens).
fn today() -> String {
    let date = js_sys::Date::new_0();
    format!(
        "{:04}-{:02}-{:02}",
        date.get_full_year(),
        date.get_month() + 1,
        date.get_date()
    )
}

/// The character's state in words, for the header.
pub fn condition_label(stats: &Characteristics) -> Option<&'static str> {
    match stats.condition() {
        Condition::Conscious => None,
        Condition::Unconscious => Some("Unconscious"),
        Condition::Dead => Some("Dead"),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_credit_amounts() {
        assert_eq!(parse_credits("1,500"), Some(1500));
        assert_eq!(parse_credits("Cr 250"), Some(250));
        assert_eq!(parse_credits(" 42 "), Some(42));
        assert_eq!(parse_credits("-5"), None);
        assert_eq!(parse_credits("0"), None);
        assert_eq!(parse_credits("lots"), None);
    }

    #[test]
    fn healing_stops_at_maximum_and_clears_current() {
        let mut stats = Characteristics::default();
        stats.end.value = 8;
        stats.end.current = Some(5);
        heal(&mut stats, Characteristic::End, 2);
        assert_eq!(stats.end.current, Some(7));
        heal(&mut stats, Characteristic::End, 5);
        assert_eq!(stats.end.current, None, "back to full");
        assert_eq!(stats.end.current(), 8);
    }

    #[test]
    fn healing_ignores_mental_characteristics() {
        let mut stats = Characteristics::default();
        stats.int.value = 9;
        heal(&mut stats, Characteristic::Int, 3);
        assert_eq!((stats.int.value, stats.int.current), (9, None));
    }
}
