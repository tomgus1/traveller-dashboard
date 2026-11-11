//! A character's page: header, characteristics and the five sheet tabs.
//!
//! Everyone in the campaign sees the header and characteristics (the
//! roster). The full sheet loads only for the owner and the referee; the
//! database enforces that, and the page shows what it's given.

use dioxus::prelude::*;
use serde::Deserialize;
use traveller_model::sheet::{Armour, Relation, Weapon};
use traveller_model::{CharacterRow, CharacterSheet, Characteristics};
use traveller_rules::{Characteristic, Credits, dm};

use super::catalogue::Pick;
use super::doc::{DocChange, DocEditor};
use super::editor::{Editor, Notice, NoticeBar, QuickActions, condition_label};
use super::fields;
use super::forms::{CharacteristicsEditor, ListEditor, SectionEditor};
use super::manage::DeleteCharacter;
use super::pay::SHEET_SOURCES;
use super::roller::{RollLog, TaskRoller, WeaponRows};
use super::tip::{Tip, glossary};
use super::{CHARACTER_COLUMNS, EdgeTab, fresh_session, is_uuid, use_session};
use crate::supabase::{self, Error};

#[derive(Deserialize)]
struct SheetRow {
    data: CharacterSheet,
    updated_at: String,
}

#[derive(Deserialize)]
struct NotesRow {
    notes: String,
}

/// Everything the page shows.
#[derive(Clone, PartialEq)]
struct Loaded {
    row: CharacterRow,
    /// None: not shared with this user, or not set up yet.
    sheet: Option<CharacterSheet>,
    /// The sheet's `updated_at`, for saving without overwriting others.
    sheet_version: Option<String>,
    sheet_missing_on_server: bool,
    /// Some only for the campaign's referee.
    referee_notes: Option<String>,
}

async fn load(
    session: Signal<Option<crate::session::Session>>,
    id: String,
) -> Result<Option<Loaded>, Error> {
    if !is_uuid(&id) {
        return Ok(None);
    }
    let current = fresh_session(session).await?;
    let Some(row) = supabase::get::<Vec<CharacterRow>>(
        &current,
        &format!("characters?select={CHARACTER_COLUMNS}&id=eq.{id}"),
    )
    .await?
    .into_iter()
    .next() else {
        return Ok(None);
    };

    let (sheet, sheet_version, sheet_missing_on_server) = match supabase::get::<Vec<SheetRow>>(
        &current,
        &format!("character_sheets?select=data,updated_at&character_id=eq.{id}"),
    )
    .await
    {
        Ok(rows) => match rows.into_iter().next() {
            Some(r) => (Some(r.data), Some(r.updated_at), false),
            None => (None, None, false),
        },
        Err(Error::Unavailable) => (None, None, true),
        Err(e) => return Err(e),
    };

    // Row Level Security returns nothing unless this user is the referee.
    let referee_notes = supabase::get::<Vec<NotesRow>>(
        &current,
        &format!("character_referee_notes?select=notes&character_id=eq.{id}"),
    )
    .await
    .ok()
    .and_then(|rows| rows.into_iter().next())
    .map(|r| r.notes);

    Ok(Some(Loaded {
        row,
        sheet,
        sheet_version,
        sheet_missing_on_server,
        referee_notes,
    }))
}

/// `/characters/:id`
#[component]
pub fn Character(id: String) -> Element {
    let session = use_session();
    let mut page = use_resource(use_reactive!(|id| load(session, id)));
    let reload = use_callback(move |()| page.restart());
    // Lives here, not in the page, so a message survives a reload.
    let notice = use_signal(|| None::<Notice>);

    rsx! {
        main { class: "page",
            EdgeTab { label: "Characters" }
            match &*page.read() {
                None => rsx! { p { class: "muted", "Loading…" } },
                Some(Err(e)) => rsx! { p { class: "error", role: "alert", "{e}" } },
                Some(Ok(None)) => rsx! {
                    h1 { class: "display", "Not found" }
                    p { class: "muted", "This character doesn't exist, or isn't shared with you." }
                },
                // Keyed by version: a reload with newer data starts the
                // page afresh rather than keeping stale edits.
                Some(Ok(Some(loaded))) => rsx! {
                    CharacterPage {
                        key: "{loaded.sheet_version.clone().unwrap_or_default()}",
                        loaded: loaded.clone(),
                        notice,
                        reload,
                    }
                },
            }
        }
    }
}

#[derive(Clone, Copy, PartialEq, Eq)]
enum Tab {
    Overview,
    Equipment,
    Finances,
    History,
    Notes,
}

impl Tab {
    const ALL: [Self; 5] = [
        Self::Overview,
        Self::Equipment,
        Self::Finances,
        Self::History,
        Self::Notes,
    ];

    fn label(self) -> &'static str {
        match self {
            Self::Overview => "Overview",
            Self::Equipment => "Equipment",
            Self::Finances => "Finances",
            Self::History => "History & people",
            Self::Notes => "Notes",
        }
    }

    fn id(self) -> &'static str {
        match self {
            Self::Overview => "overview",
            Self::Equipment => "equipment",
            Self::Finances => "finances",
            Self::History => "history",
            Self::Notes => "notes",
        }
    }
}

#[component]
fn CharacterPage(loaded: Loaded, notice: Signal<Option<Notice>>, reload: Callback<()>) -> Element {
    let mut tab = use_signal(|| Tab::Overview);
    let mut editing = use_signal(|| false);
    let session = use_session();
    let character_id = use_signal(|| loaded.row.id.clone());
    let sheet = use_signal(|| loaded.sheet.clone().unwrap_or_default());
    let version = use_signal(|| loaded.sheet_version.clone());
    let stats = use_signal(|| loaded.row.characteristics.unwrap_or_default());
    let saving = use_signal(|| false);
    let editor = use_context_provider(|| Editor {
        session,
        character_id,
        sheet,
        version,
        stats,
        notice,
        saving,
        reload,
    });
    // The edit forms work on JSON; this applies their changes to the sheet
    // and saves through the editor (which checks the sheet is unchanged).
    let doc = use_memo(move || serde_json::to_value(&*sheet.read()).unwrap_or_default());
    let change = use_callback(move |(change, done): (DocChange, &'static str)| {
        let mut json = doc.peek().clone();
        change.apply_to(&mut json);
        if let Ok(updated) = serde_json::from_value::<CharacterSheet>(json) {
            editor.update_sheet(done, move |s| *s = updated);
        } else {
            let mut notice = notice;
            notice.set(Some(Notice {
                text: "That doesn't fit the sheet; nothing was saved.".into(),
                is_error: true,
            }));
        }
    });
    use_context_provider(|| DocEditor {
        doc,
        saving,
        change,
    });
    let row = &loaded.row;
    let current_sheet = sheet();
    // Shown and rolled with augment bonuses on top of the Traveller's own.
    let own_stats = stats();
    let stats = current_sheet.effective(&own_stats);
    let bonus = Characteristic::ALL.map(|c| current_sheet.characteristic_bonus(c));
    // Players manage their own sheets; everyone else (the referee) reads.
    let editable =
        session().is_some_and(|s| loaded.row.owner_id.as_deref() == Some(s.user_id.as_str()));

    // Arrow keys, Home and End move between tabs (WAI-ARIA tabs pattern).
    let on_key = move |e: KeyboardEvent| {
        let i = Tab::ALL.iter().position(|t| *t == tab()).unwrap_or(0);
        let next = match e.key() {
            Key::ArrowRight => Some((i + 1) % Tab::ALL.len()),
            Key::ArrowLeft => Some((i + Tab::ALL.len() - 1) % Tab::ALL.len()),
            Key::Home => Some(0),
            Key::End => Some(Tab::ALL.len() - 1),
            _ => None,
        };
        if let Some(n) = next {
            e.prevent_default();
            tab.set(Tab::ALL[n]);
        }
    };

    rsx! {
        div { class: "sheet-head",
            div {
                h1 { class: "display", "{row.display_name()}" }
                p { class: "muted", {subtitle(&loaded)} }
            }
            div { class: "upp-block",
                span { class: "label", Tip { text: glossary::UPP, "UPP" } }
                span { class: "upp big", {stats.upp()} }
            }
        }

        NoticeBar {}

        match &loaded.sheet {
            None => rsx! {
                Stats { stats, bonus }
                if loaded.sheet_missing_on_server {
                    p { class: "notice",
                        "The full character sheet isn't set up on the server yet (database migration 06)."
                    }
                } else {
                    p { class: "muted", "The full sheet is visible to this character's player and the referee." }
                }
            },
            Some(_) => rsx! {
                if editable {
                    div { class: "edit-toggle",
                        button {
                            class: if editing() { "btn" } else { "btn outline" },
                            r#type: "button",
                            aria_pressed: editing(),
                            onclick: move |_| editing.toggle(),
                            if editing() { "Done editing" } else { "Edit sheet" }
                        }
                    }
                }
                div { class: "tabs", role: "tablist", aria_label: "Character sections", onkeydown: on_key,
                    for t in Tab::ALL {
                        button {
                            key: "{t.id()}",
                            id: "tab-{t.id()}",
                            class: "tab",
                            r#type: "button",
                            role: "tab",
                            aria_selected: tab() == t,
                            aria_controls: "panel-{t.id()}",
                            tabindex: if tab() == t { "0" } else { "-1" },
                            onclick: move |_| tab.set(t),
                            "{t.label()}"
                        }
                    }
                }
                div {
                    id: "panel-{tab().id()}",
                    role: "tabpanel",
                    aria_labelledby: "tab-{tab().id()}",
                    if editing() && editable {
                        EditTab { tab: tab(), name: row.display_name().to_string() }
                    } else {
                    match tab() {
                        Tab::Overview => rsx! { Overview { stats, bonus, sheet: current_sheet.clone(), editable } },
                        Tab::Equipment => rsx! { Equipment { sheet: current_sheet.clone() } },
                        Tab::Finances => rsx! { Finances { sheet: current_sheet.clone() } },
                        Tab::History => rsx! { History { sheet: current_sheet.clone() } },
                        Tab::Notes => rsx! { Notes { sheet: current_sheet.clone(), referee_notes: loaded.referee_notes.clone() } },
                    }
                    }
                }
            },
        }
    }
}

/// The editors for one tab (owner only).
#[component]
fn EditTab(tab: Tab, name: String) -> Element {
    match tab {
        Tab::Overview => rsx! {
            CharacteristicsEditor {}
            ListEditor { path: "skills", title: "Skills", fields: fields::SKILLS }
        },
        Tab::Equipment => rsx! {
            ListEditor { path: "weapons", title: "Weapons", fields: fields::WEAPONS, catalogue: Pick::Weapon, pay: SHEET_SOURCES }
            ListEditor { path: "ammo", title: "Ammunition", fields: fields::AMMO }
            ListEditor { path: "armour", title: "Armour", fields: fields::ARMOUR, catalogue: Pick::Armour, pay: SHEET_SOURCES }
            ListEditor { path: "gear", title: "Gear", fields: fields::GEAR, catalogue: Pick::Gear, pay: SHEET_SOURCES }
            ListEditor { path: "augments", title: "Augments", fields: fields::AUGMENTS, catalogue: Pick::Augment, pay: SHEET_SOURCES }
        },
        Tab::Finances => rsx! {
            SectionEditor { path: "finances", title: "Finances", fields: fields::FINANCES }
            ListEditor { path: "finances.ledger", title: "Ledger", fields: fields::LEDGER }
        },
        Tab::History => rsx! {
            SectionEditor { path: "identity", title: "Background", fields: fields::IDENTITY }
            ListEditor { path: "people", title: "Contacts, allies, rivals & enemies", fields: fields::PEOPLE }
            ListEditor { path: "career", title: "Career terms", fields: fields::CAREER }
            ListEditor { path: "training", title: "Training", fields: fields::TRAINING }
        },
        Tab::Notes => rsx! {
            SectionEditor { path: "", title: "Notes", fields: fields::NOTES }
            DeleteCharacter { name }
        },
    }
}

fn subtitle(loaded: &Loaded) -> String {
    let mut parts = Vec::new();
    if let Some(sheet) = &loaded.sheet {
        let id = &sheet.identity;
        if !id.species.is_empty() {
            parts.push(id.species.clone());
        }
        if let Some(age) = id.age {
            parts.push(format!("Age {age}"));
        }
        if !id.homeworld.is_empty() {
            parts.push(format!("Homeworld {}", id.homeworld));
        }
    }
    if let Some(player) = loaded.row.player_name.as_deref().filter(|p| !p.is_empty()) {
        parts.push(format!("Played by {player}"));
    }
    parts.join(" · ")
}

// ---------------------------------------------------------------------------
// Overview

/// Characteristics as they count (with augment bonuses); `bonus` is each
/// one's augment bonus, in [`Characteristic::ALL`] order.
#[component]
fn Stats(stats: Characteristics, bonus: [i32; 6]) -> Element {
    let condition = condition_label(&stats);
    rsx! {
        section { aria_labelledby: "chars",
            h2 { id: "chars", class: "section", "Characteristics" }
            if let Some(state) = condition {
                p { class: "notice", role: "status", "{state}" }
            }
            div { class: "stats",
                for (i, c) in Characteristic::ALL.into_iter().enumerate() {
                    StatBox { key: "{c}", c, stats, bonus: bonus[i] }
                }
            }
            p { class: "muted small", "Large figures are current values; red means reduced by damage." }
        }
    }
}

#[component]
fn StatBox(c: Characteristic, stats: Characteristics, bonus: i32) -> Element {
    let stat = stats.get(c);
    let reduced = stat.is_reduced();
    let modifier = signed(dm(stat.current()));
    rsx! {
        div { class: "stat",
            p { class: "stat-key", Tip { text: glossary::characteristic(c), "{c}" } }
            p { class: if reduced { "stat-value reduced" } else { "stat-value" }, "{stat.current()}" }
            p { class: "stat-dm",
                if reduced { "of {stat.value} · " }
                Tip { text: glossary::DM, "DM" }
                " {modifier}"
            }
            if bonus != 0 {
                p { class: "stat-dm", Tip { text: glossary::AUGMENT_BONUS, "{signed(bonus)} aug" } }
            }
        }
    }
}

#[component]
fn Overview(
    stats: Characteristics,
    bonus: [i32; 6],
    sheet: CharacterSheet,
    editable: bool,
) -> Element {
    let email = use_session()().map(|s| s.email).unwrap_or_default();
    let listed = sheet.listed_skills();
    let skills = sheet.effective_skills();
    let worn: Vec<Armour> = sheet.worn_armour().cloned().collect();
    let skill_levels: Vec<(String, i32)> =
        skills.iter().map(|s| (s.name.clone(), s.level())).collect();
    RollLog::provide();

    rsx! {
        Stats { stats, bonus }
        if editable {
            QuickActions {}
            TaskRoller { stats, skills: skill_levels.clone() }
        } else {
            p { class: "notice",
                "Read only: this character belongs to another account, and players manage their own sheets. "
                "You're signed in as {email}."
            }
        }
        div { class: "columns",
            section { aria_labelledby: "skills",
                h2 { id: "skills", class: "section", "Skills" }
                if listed.is_empty() {
                    Empty {}
                } else {
                    table { class: "data",
                        thead { tr { th { scope: "col", "Skill" } th { scope: "col", class: "num", Tip { text: glossary::LEVEL, "Level" } } } }
                        tbody {
                            for (i, l) in listed.iter().enumerate() {
                                tr { key: "{i}", class: if l.implied { "implied" } else { "" },
                                    td {
                                        "{l.skill.name}"
                                        if l.skill.own.is_none() {
                                            span { class: "muted small", " (augment)" }
                                        } else if l.skill.bonus != 0 {
                                            span { class: "muted small", " ({signed(l.skill.bonus)} augment)" }
                                        }
                                    }
                                    td { class: if l.implied { "num" } else { "num strong" }, "{l.skill.level()}" }
                                }
                            }
                        }
                    }
                    if listed.iter().any(|l| l.implied) {
                        p { class: "muted small", "Greyed: other specialities of your skills, at 0 (Core p.58)." }
                    }
                }
            }
            div {
                section { aria_labelledby: "weapons",
                    h2 { id: "weapons", class: "section", "Weapons" }
                    if editable {
                        WeaponRows { weapons: sheet.weapons.clone(), stats, skills: skill_levels }
                    } else {
                        WeaponTable { weapons: sheet.weapons.clone(), full: false }
                    }
                }
                section { aria_labelledby: "armour",
                    h2 { id: "armour", class: "section", "Armour worn" }
                    ArmourTable { armour: worn, full: false }
                }
                if sheet.rads > 0 {
                    p { class: "muted", Tip { text: glossary::RADS, "Radiation" } ": ", strong { "{sheet.rads} rads" } }
                }
            }
        }
    }
}

// ---------------------------------------------------------------------------
// Equipment

#[component]
fn WeaponTable(weapons: Vec<Weapon>, full: bool) -> Element {
    if weapons.is_empty() {
        return rsx! { Empty {} };
    }
    rsx! {
        div { class: "scroll",
            table { class: "data",
                thead { tr {
                    th { scope: "col", "Weapon" }
                    if full { th { scope: "col", class: "num", Tip { text: glossary::TL, "TL" } } }
                    th { scope: "col", Tip { text: glossary::RANGE, "Range" } }
                    th { scope: "col", Tip { text: glossary::DAMAGE, "Damage" } }
                    th { scope: "col", class: "num", Tip { text: glossary::ROUNDS, "Rounds" } }
                    if full {
                        th { scope: "col", class: "num", Tip { text: glossary::SPARE_MAGS, "Spare mags" } }
                        th { scope: "col", class: "num", Tip { text: glossary::KG, "Kg" } }
                    }
                    th { scope: "col", Tip { text: glossary::TRAITS, "Traits" } }
                } }
                tbody {
                    for (i, w) in weapons.iter().enumerate() {
                        tr { key: "{i}",
                            td { class: "strong", "{w.name}" }
                            if full { td { class: "num", {opt(w.tl)} } }
                            td { {dash(&w.range)} }
                            td { {dash(&w.damage)} }
                            td { class: "num strong", {rounds(w)} }
                            if full {
                                td { class: "num", {if w.magazine.is_some() { w.spare_magazines.to_string() } else { "—".into() }} }
                                td { class: "num", {kg(w.kg)} }
                            }
                            td { class: "muted", {dash(&w.traits)} }
                        }
                    }
                }
            }
        }
    }
}

#[component]
fn ArmourTable(armour: Vec<Armour>, full: bool) -> Element {
    if armour.is_empty() {
        return rsx! { Empty {} };
    }
    rsx! {
        table { class: "data",
            thead { tr {
                th { scope: "col", "Armour" }
                th { scope: "col", class: "num", Tip { text: glossary::PROTECTION, "Protection" } }
                th { scope: "col", class: "num", Tip { text: glossary::RAD, "Rad" } }
                if full {
                    th { scope: "col", class: "num", Tip { text: glossary::KG, "Kg" } }
                    th { scope: "col", "Worn" }
                }
            } }
            tbody {
                for (i, a) in armour.iter().enumerate() {
                    tr { key: "{i}",
                        td { class: "strong", "{a.name}" }
                        td { class: "num strong", "+{a.protection}" }
                        td { class: "num", {opt(a.rad)} }
                        if full {
                            td { class: "num", {kg(a.kg)} }
                            td { if a.worn { "Yes" } else { "—" } }
                        }
                    }
                }
            }
        }
    }
}

#[component]
fn Equipment(sheet: CharacterSheet) -> Element {
    rsx! {
        section { aria_labelledby: "eq-weapons",
            h2 { id: "eq-weapons", class: "section", "Weapons" }
            WeaponTable { weapons: sheet.weapons.clone(), full: true }
        }
        if !sheet.ammo.is_empty() {
            section { aria_labelledby: "eq-ammo",
                h2 { id: "eq-ammo", class: "section", "Ammunition" }
                table { class: "data",
                    thead { tr { th { scope: "col", "Ammunition" } th { scope: "col", "For" } th { scope: "col", class: "num", "Rounds" } } }
                    tbody {
                        for (i, a) in sheet.ammo.iter().enumerate() {
                            tr { key: "{i}",
                                td { "{a.name}" }
                                td { class: "muted", {dash(&a.weapon)} }
                                td { class: "num strong",
                                    {a.capacity.map_or_else(|| a.rounds.to_string(), |c| format!("{} / {c}", a.rounds))}
                                }
                            }
                        }
                    }
                }
            }
        }
        section { aria_labelledby: "eq-armour",
            h2 { id: "eq-armour", class: "section", "Armour" }
            ArmourTable { armour: sheet.armour.clone(), full: true }
        }
        section { aria_labelledby: "eq-gear",
            h2 { id: "eq-gear", class: "section", "Gear" }
            if sheet.gear.is_empty() {
                Empty {}
            } else {
                table { class: "data",
                    thead { tr {
                        th { scope: "col", "Item" }
                        th { scope: "col", class: "num", Tip { text: glossary::TL, "TL" } }
                        th { scope: "col", class: "num", "Qty" }
                        th { scope: "col", class: "num", Tip { text: glossary::KG, "Kg each" } }
                    } }
                    tbody {
                        for (i, item) in sheet.gear.iter().enumerate() {
                            tr { key: "{i}",
                                td { "{item.name}"
                                    if !item.notes.is_empty() { br {} span { class: "muted small", "{item.notes}" } }
                                }
                                td { class: "num", {opt(item.tl)} }
                                td { class: "num", "{item.quantity}" }
                                td { class: "num", {kg(item.kg)} }
                            }
                        }
                    }
                }
            }
            p { class: "total", "Total carried: ", strong { {format!("{} kg", trim_kg(sheet.carried_kg()))} } }
        }
        if !sheet.augments.is_empty() {
            section { aria_labelledby: "eq-aug",
                h2 { id: "eq-aug", class: "section", "Augments" }
                table { class: "data",
                    thead { tr { th { scope: "col", "Augment" } th { scope: "col", class: "num", Tip { text: glossary::TL, "TL" } } th { scope: "col", "Effect" } } }
                    tbody {
                        for (i, a) in sheet.augments.iter().enumerate() {
                            tr { key: "{i}", td { "{a.name}" } td { class: "num", {opt(a.tl)} } td { class: "muted", {dash(&a.effect)} } }
                        }
                    }
                }
            }
        }
    }
}

// ---------------------------------------------------------------------------
// Finances

#[component]
fn Finances(sheet: CharacterSheet) -> Element {
    let f = &sheet.finances;
    let summary = [
        ("Cash on hand", None, Credits(f.cash).to_string()),
        ("Pension", Some(glossary::PENSION), per(f.pension, "year")),
        (
            "Debts",
            Some(glossary::DEBTS),
            if f.debt == 0 {
                "—".into()
            } else {
                Credits(f.debt).to_string()
            },
        ),
        (
            "Living cost",
            Some(glossary::LIVING_COST),
            per(f.living_cost, "month"),
        ),
    ];
    rsx! {
        section { aria_labelledby: "fin",
            h2 { id: "fin", class: "section", "Finances" }
            table { class: "data summary",
                tbody {
                    for (label, tip, value) in summary {
                        tr { key: "{label}",
                            th { scope: "row",
                                if let Some(text) = tip { Tip { text, "{label}" } } else { "{label}" }
                            }
                            td { class: "num strong", "{value}" }
                        }
                    }
                }
            }
        }
        section { aria_labelledby: "ledger",
            h2 { id: "ledger", class: "section", "Ledger" }
            if f.ledger.is_empty() {
                Empty {}
            } else {
                table { class: "data",
                    thead { tr { th { scope: "col", "Date" } th { scope: "col", "Entry" } th { scope: "col", class: "num", "Amount" } } }
                    tbody {
                        for (i, entry) in f.ledger.iter().enumerate().rev() {
                            tr { key: "{i}",
                                td { class: "muted", "{entry.date}" }
                                td { "{entry.description}" }
                                td { class: if entry.amount < 0 { "num strong neg" } else { "num strong pos" },
                                    {signed_credits(entry.amount)}
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

// ---------------------------------------------------------------------------
// History & people

#[component]
fn History(sheet: CharacterSheet) -> Element {
    let id = &sheet.identity;
    let details: Vec<(&str, String)> = [
        ("Species", id.species.clone()),
        ("Gender", id.gender.clone()),
        ("Age", id.age.map(|a| a.to_string()).unwrap_or_default()),
        ("Homeworld", id.homeworld.clone()),
        ("Citizenship", id.citizenship.clone()),
        ("Background", id.background.clone()),
        ("Education", id.education.clone()),
    ]
    .into_iter()
    .filter(|(_, v)| !v.is_empty())
    .collect();

    rsx! {
        section { aria_labelledby: "bg",
            h2 { id: "bg", class: "section", "Background" }
            if details.is_empty() {
                Empty {}
            } else {
                dl { class: "details",
                    for (label, value) in details {
                        div { key: "{label}",
                            dt { "{label}" }
                            dd { "{value}" }
                        }
                    }
                }
            }
        }
        section { aria_labelledby: "career",
            h2 { id: "career", class: "section", "Career" }
            if sheet.career.is_empty() {
                Empty {}
            } else {
                div { class: "scroll",
                    table { class: "data",
                        thead { tr {
                            th { scope: "col", class: "num", "Term" }
                            th { scope: "col", "Career · assignment" }
                            th { scope: "col", "Rank" }
                            th { scope: "col", "Events" }
                            th { scope: "col", "Gained" }
                        } }
                        tbody {
                            for (i, term) in sheet.career.iter().enumerate() {
                                tr { key: "{i}",
                                    td { class: "num upp", "{i + 1}" }
                                    td { class: "strong", {join_dot(&term.career, &term.assignment)} }
                                    td { {dash(&term.rank)} }
                                    td { {dash(&term.events)} }
                                    td { class: "muted", {dash(&term.gained)} }
                                }
                            }
                        }
                    }
                }
            }
        }
        section { aria_labelledby: "people",
            h2 { id: "people", class: "section", "Contacts, allies, rivals & enemies" }
            if sheet.people.is_empty() {
                Empty {}
            } else {
                table { class: "data",
                    thead { tr { th { scope: "col", "Type" } th { scope: "col", "Name" } th { scope: "col", "Location" } th { scope: "col", "Relationship" } } }
                    tbody {
                        for (i, p) in sheet.people.iter().enumerate() {
                            tr { key: "{i}",
                                td { class: relation_class(p.relation), {relation_label(p.relation)} }
                                td { class: "strong", "{p.name}" }
                                td { {dash(&p.location)} }
                                td { class: "muted", {dash(&p.relationship)} }
                            }
                        }
                    }
                }
            }
        }
        if !sheet.training.is_empty() {
            section { aria_labelledby: "training",
                h2 { id: "training", class: "section", "Training" }
                for (i, t) in sheet.training.iter().enumerate() {
                    div { key: "{i}", class: "training",
                        p { strong { "{t.skill}" } span { class: "muted", " · {t.weeks_done} of {t.weeks_needed} weeks" } }
                        progress { max: "{t.weeks_needed.max(1)}", value: "{t.weeks_done}", aria_label: "Training progress for {t.skill}" }
                    }
                }
            }
        }
        if let Some(psi) = &sheet.psionics {
            section { aria_labelledby: "psi",
                h2 { id: "psi", class: "section", "Psionics" }
                p { "PSI ", strong { {psi.current.unwrap_or(psi.psi).to_string()} } span { class: "muted", " of {psi.psi}" } }
                for (i, talent) in psi.talents.iter().enumerate() {
                    p { key: "{i}", "{talent.name} ", strong { "{talent.level}" } }
                }
            }
        }
    }
}

// ---------------------------------------------------------------------------
// Notes

#[component]
fn Notes(sheet: CharacterSheet, referee_notes: Option<String>) -> Element {
    rsx! {
        section { aria_labelledby: "notes",
            h2 { id: "notes", class: "section", "Notes" }
            if sheet.notes.trim().is_empty() {
                Empty {}
            } else {
                p { class: "prose", "{sheet.notes}" }
            }
        }
        if !sheet.injuries.trim().is_empty() || sheet.rads > 0 {
            section { aria_labelledby: "injuries",
                h2 { id: "injuries", class: "section", "Injuries & radiation" }
                if !sheet.injuries.trim().is_empty() { p { class: "prose", "{sheet.injuries}" } }
                p { Tip { text: glossary::RADS, "Accumulated radiation" } ": ", strong { "{sheet.rads} rads" } }
            }
        }
        if let Some(notes) = referee_notes {
            section { class: "referee", aria_labelledby: "ref",
                h2 { id: "ref", class: "referee-title", "Referee only" }
                if notes.trim().is_empty() {
                    p { class: "muted", "No private notes." }
                } else {
                    p { class: "prose", "{notes}" }
                }
            }
        }
    }
}

// ---------------------------------------------------------------------------
// Formatting

#[component]
fn Empty() -> Element {
    rsx! { p { class: "muted", "Nothing recorded yet." } }
}

/// "+1", "−2", "+0".
fn signed(value: i32) -> String {
    if value < 0 {
        format!("\u{2212}{}", value.abs())
    } else {
        format!("+{value}")
    }
}

fn dash(text: &str) -> String {
    if text.trim().is_empty() {
        "—".into()
    } else {
        text.to_string()
    }
}

fn opt<T: ToString>(value: Option<T>) -> String {
    value.map_or_else(|| "—".into(), |v| v.to_string())
}

fn trim_kg(value: f64) -> String {
    let s = format!("{value:.2}");
    s.trim_end_matches('0').trim_end_matches('.').to_string()
}

fn kg(value: Option<f64>) -> String {
    value.map_or_else(|| "—".into(), trim_kg)
}

fn rounds(w: &Weapon) -> String {
    match (w.rounds, w.magazine) {
        (Some(r), Some(m)) => format!("{r} / {m}"),
        (None, Some(m)) => format!("— / {m}"),
        _ => "—".into(),
    }
}

fn per(amount: i64, period: &str) -> String {
    if amount == 0 {
        "—".into()
    } else {
        format!("{} / {period}", Credits(amount))
    }
}

fn signed_credits(amount: i64) -> String {
    if amount > 0 {
        format!("+{}", Credits(amount))
    } else {
        Credits(amount).to_string()
    }
}

fn join_dot(a: &str, b: &str) -> String {
    match (a.trim().is_empty(), b.trim().is_empty()) {
        (false, false) => format!("{a} · {b}"),
        (false, true) => a.to_string(),
        (true, false) => b.to_string(),
        (true, true) => "—".into(),
    }
}

fn relation_label(r: Relation) -> &'static str {
    match r {
        Relation::Contact => "Contact",
        Relation::Ally => "Ally",
        Relation::Rival => "Rival",
        Relation::Enemy => "Enemy",
    }
}

fn relation_class(r: Relation) -> &'static str {
    match r {
        Relation::Contact => "tag",
        Relation::Ally => "tag pos",
        Relation::Rival | Relation::Enemy => "tag neg",
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn signed_formatting() {
        assert_eq!(signed(1), "+1");
        assert_eq!(signed(0), "+0");
        assert_eq!(signed(-2), "\u{2212}2");
    }

    #[test]
    fn kg_formatting() {
        assert_eq!(trim_kg(9.5), "9.5");
        assert_eq!(trim_kg(8.0), "8");
        assert_eq!(trim_kg(0.75), "0.75");
        assert_eq!(kg(None), "—");
    }

    #[test]
    fn rounds_formatting() {
        let mut w = Weapon {
            magazine: Some(15),
            rounds: Some(12),
            ..Weapon::default()
        };
        assert_eq!(rounds(&w), "12 / 15");
        w.rounds = None;
        assert_eq!(rounds(&w), "— / 15");
        assert_eq!(rounds(&Weapon::default()), "—");
    }

    #[test]
    fn money_formatting() {
        assert_eq!(signed_credits(62_000), "+Cr62,000");
        assert_eq!(signed_credits(-250), "\u{2212}Cr250");
        assert_eq!(per(1000, "month"), "Cr1,000 / month");
        assert_eq!(per(0, "year"), "—");
    }
}
