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

use super::editor::{Editor, Notice, NoticeBar, QuickActions, WeaponButtons, condition_label};
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
    let session = use_session();
    let character_id = use_signal(|| loaded.row.id.clone());
    let sheet = use_signal(|| loaded.sheet.clone().unwrap_or_default());
    let version = use_signal(|| loaded.sheet_version.clone());
    let stats = use_signal(|| loaded.row.characteristics.unwrap_or_default());
    let saving = use_signal(|| false);
    use_context_provider(|| Editor {
        session,
        character_id,
        sheet,
        version,
        stats,
        notice,
        saving,
        reload,
    });
    let row = &loaded.row;
    let stats = stats();
    let current_sheet = sheet();

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
                span { class: "label", "UPP" }
                span { class: "upp big", {stats.upp()} }
            }
        }

        NoticeBar {}

        match &loaded.sheet {
            None => rsx! {
                Stats { stats }
                if loaded.sheet_missing_on_server {
                    p { class: "notice",
                        "The full character sheet isn't set up on the server yet (database migration 06)."
                    }
                } else {
                    p { class: "muted", "The full sheet is visible to this character's player and the referee." }
                }
            },
            Some(_) => rsx! {
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
                    match tab() {
                        Tab::Overview => rsx! { Overview { stats, sheet: current_sheet.clone() } },
                        Tab::Equipment => rsx! { Equipment { sheet: current_sheet.clone() } },
                        Tab::Finances => rsx! { Finances { sheet: current_sheet.clone() } },
                        Tab::History => rsx! { History { sheet: current_sheet.clone() } },
                        Tab::Notes => rsx! { Notes { sheet: current_sheet.clone(), referee_notes: loaded.referee_notes.clone() } },
                    }
                }
            },
        }
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

#[component]
fn Stats(stats: Characteristics) -> Element {
    let condition = condition_label(&stats);
    rsx! {
        section { aria_labelledby: "chars",
            h2 { id: "chars", class: "section", "Characteristics" }
            if let Some(state) = condition {
                p { class: "notice", role: "status", "{state}" }
            }
            div { class: "stats",
                for c in Characteristic::ALL {
                    StatBox { key: "{c}", c, stats }
                }
            }
            p { class: "muted small", "Large figures are current values; red means reduced by damage." }
        }
    }
}

#[component]
fn StatBox(c: Characteristic, stats: Characteristics) -> Element {
    let stat = stats.get(c);
    let reduced = stat.is_reduced();
    let detail = if reduced {
        format!("of {} · {}", stat.value, format_dm(dm(stat.current())))
    } else {
        format_dm(dm(stat.current()))
    };
    rsx! {
        div { class: "stat",
            p { class: "stat-key", "{c}" }
            p { class: if reduced { "stat-value reduced" } else { "stat-value" }, "{stat.current()}" }
            p { class: "stat-dm", "{detail}" }
        }
    }
}

#[component]
fn Overview(stats: Characteristics, sheet: CharacterSheet) -> Element {
    let mut skills = sheet.skills.clone();
    skills.sort_by(|a, b| b.level.cmp(&a.level).then_with(|| a.name.cmp(&b.name)));
    let worn: Vec<Armour> = sheet.worn_armour().cloned().collect();

    rsx! {
        Stats { stats }
        QuickActions {}
        div { class: "columns",
            section { aria_labelledby: "skills",
                h2 { id: "skills", class: "section", "Skills" }
                if skills.is_empty() {
                    Empty {}
                } else {
                    table { class: "data",
                        thead { tr { th { scope: "col", "Skill" } th { scope: "col", class: "num", "Level" } } }
                        tbody {
                            for (i, skill) in skills.iter().enumerate() {
                                tr { key: "{i}",
                                    td { "{skill.name}" }
                                    td { class: "num strong", "{skill.level}" }
                                }
                            }
                        }
                    }
                }
            }
            div {
                section { aria_labelledby: "weapons",
                    h2 { id: "weapons", class: "section", "Weapons" }
                    WeaponTable { weapons: sheet.weapons.clone(), full: false, actions: true }
                }
                section { aria_labelledby: "armour",
                    h2 { id: "armour", class: "section", "Armour worn" }
                    ArmourTable { armour: worn, full: false }
                }
                if sheet.rads > 0 {
                    p { class: "muted", "Radiation: ", strong { "{sheet.rads} rads" } }
                }
            }
        }
    }
}

// ---------------------------------------------------------------------------
// Equipment

#[component]
fn WeaponTable(weapons: Vec<Weapon>, full: bool, actions: bool) -> Element {
    if weapons.is_empty() {
        return rsx! { Empty {} };
    }
    rsx! {
        div { class: "scroll",
            table { class: "data",
                thead { tr {
                    th { scope: "col", "Weapon" }
                    if full { th { scope: "col", class: "num", "TL" } }
                    th { scope: "col", "Range" }
                    th { scope: "col", "Damage" }
                    th { scope: "col", class: "num", "Rounds" }
                    if full {
                        th { scope: "col", class: "num", "Spare mags" }
                        th { scope: "col", class: "num", "Kg" }
                    }
                    th { scope: "col", "Traits" }
                    if actions { th { scope: "col", span { class: "sr-only", "Actions" } } }
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
                            if actions { td { WeaponButtons { index: i } } }
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
                th { scope: "col", class: "num", "Protection" }
                th { scope: "col", class: "num", "Rad" }
                if full {
                    th { scope: "col", class: "num", "Kg" }
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
            WeaponTable { weapons: sheet.weapons.clone(), full: true, actions: false }
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
                        th { scope: "col", class: "num", "TL" }
                        th { scope: "col", class: "num", "Qty" }
                        th { scope: "col", class: "num", "Kg each" }
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
                    thead { tr { th { scope: "col", "Augment" } th { scope: "col", class: "num", "TL" } th { scope: "col", "Effect" } } }
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
        ("Cash on hand", Credits(f.cash).to_string()),
        ("Pension", per(f.pension, "year")),
        (
            "Debts",
            if f.debt == 0 {
                "—".into()
            } else {
                Credits(f.debt).to_string()
            },
        ),
        ("Living cost", per(f.living_cost, "month")),
    ];
    rsx! {
        section { aria_labelledby: "fin",
            h2 { id: "fin", class: "section", "Finances" }
            table { class: "data summary",
                tbody {
                    for (label, value) in summary {
                        tr { key: "{label}", th { scope: "row", "{label}" } td { class: "num strong", "{value}" } }
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
                p { "Accumulated radiation: ", strong { "{sheet.rads} rads" } }
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

/// "DM +1", "DM −2", "DM +0".
fn format_dm(value: i32) -> String {
    if value < 0 {
        format!("DM \u{2212}{}", value.abs())
    } else {
        format!("DM +{value}")
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
    fn dm_formatting() {
        assert_eq!(format_dm(1), "DM +1");
        assert_eq!(format_dm(0), "DM +0");
        assert_eq!(format_dm(-2), "DM \u{2212}2");
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
