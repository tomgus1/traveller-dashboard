//! A campaign's shared state: party funds and locker, the ship, cargo and
//! trade, and travel. Every member reads and edits it.
//!
//! Edits are [`DocChange`] operations. Each is applied on screen at once
//! and saved only if the state hasn't changed since it was loaded; if
//! someone else saved in between, the latest state is fetched, the same
//! operation applied on top, and saved again. Two people logging trades at
//! once both land.

use std::fmt::Write as _;

use dioxus::prelude::*;
use serde::Deserialize;
use serde_json::{Map, Value, json};
use traveller_model::CampaignState;
use traveller_model::campaign_state::{ContractStatus, Funds, ImperialDate, TradeSide};
use traveller_rules::Credits;

use super::catalogue::Pick;
use super::doc::{DocChange, DocEditor, Target, new_id};
use super::fields;
use super::forms::{ListEditor, SectionEditor};
use super::fresh_session;
use super::pay::CAMPAIGN_SOURCES;
use super::tip::{Tip, glossary};
use crate::session::Session;
use crate::supabase::{self, Error};

#[derive(Deserialize)]
struct StateRow {
    data: CampaignState,
    updated_at: String,
}

/// Loads a campaign's state and its version. `None` if migration 08 isn't
/// applied (or the user isn't a member).
pub async fn load_state(
    current: &Session,
    campaign_id: &str,
) -> Result<Option<(CampaignState, String)>, Error> {
    match supabase::get::<Vec<StateRow>>(
        current,
        &format!("campaign_state?select=data,updated_at&campaign_id=eq.{campaign_id}"),
    )
    .await
    {
        Ok(rows) => Ok(rows.into_iter().next().map(|r| (r.data, r.updated_at))),
        Err(Error::Unavailable) => Ok(None),
        Err(e) => Err(e),
    }
}

/// Context for the shared-state views.
#[derive(Clone, Copy, PartialEq)]
pub struct Shared {
    pub state: Signal<CampaignState>,
    /// Members can edit; the page hides edit controls otherwise.
    pub can_edit: bool,
    pub message: Signal<Option<(String, bool)>>,
}

fn use_shared() -> Shared {
    use_context()
}

async fn save(
    session: Signal<Option<Session>>,
    campaign_id: &str,
    change: &DocChange,
    mut state: Signal<CampaignState>,
    mut version: Signal<Option<String>>,
) -> Result<(), Error> {
    #[derive(Deserialize)]
    struct Saved {
        updated_at: String,
    }
    for attempt in 0..4 {
        let current = fresh_session(session).await?;
        // First try from what's on screen; after a clash, from the latest.
        let (mut json, base_version) = if attempt == 0 {
            (
                serde_json::to_value(&*state.peek()).unwrap_or_default(),
                version.peek().clone(),
            )
        } else {
            match load_state(&current, campaign_id).await? {
                Some((latest, v)) => (serde_json::to_value(latest).unwrap_or_default(), Some(v)),
                None => return Err(Error::Server),
            }
        };
        change.apply_to(&mut json);
        let updated: CampaignState = serde_json::from_value(json).map_err(|_| Error::Server)?;

        let mut path = format!("campaign_state?campaign_id=eq.{campaign_id}&select=updated_at");
        if let Some(v) = base_version.as_deref() {
            let _ = write!(path, "&updated_at=eq.{}", supabase::encode(v));
        }
        let saved: Vec<Saved> =
            supabase::patch(&current, &path, &json!({ "data": updated })).await?;
        if let Some(row) = saved.into_iter().next() {
            state.set(updated);
            version.set(Some(row.updated_at));
            return Ok(());
        }
        // Someone else saved first: go round again from the latest state.
    }
    Err(Error::Rejected(
        "Lots of people are editing at once; please try again.".into(),
    ))
}

/// Applies a change to a campaign's latest saved state, from outside the
/// campaign page (a character paying from party funds). `make` builds the
/// change from the state it will apply to, so checks such as "is there
/// enough money" see the latest. Retries if someone else saves in between.
/// Returns the saved state.
pub async fn apply_latest(
    session: Signal<Option<Session>>,
    campaign_id: &str,
    make: impl Fn(&Value) -> Result<DocChange, String>,
) -> Result<Value, String> {
    for _ in 0..4 {
        let current = fresh_session(session).await.map_err(|e| e.to_string())?;
        let Some((latest, version)) = load_state(&current, campaign_id)
            .await
            .map_err(|e| e.to_string())?
        else {
            return Err("The campaign's funds can't be read.".into());
        };
        let mut json = serde_json::to_value(latest).unwrap_or_default();
        make(&json)?.apply_to(&mut json);
        let updated: CampaignState = serde_json::from_value(json)
            .map_err(|_| "That doesn't fit the campaign; nothing was paid.".to_string())?;
        let path = format!(
            "campaign_state?campaign_id=eq.{campaign_id}&select=updated_at&updated_at=eq.{}",
            supabase::encode(&version)
        );
        let saved: Vec<Value> = supabase::patch(&current, &path, &json!({ "data": updated }))
            .await
            .map_err(|e| e.to_string())?;
        if !saved.is_empty() {
            return Ok(serde_json::to_value(updated).unwrap_or_default());
        }
    }
    Err("Lots of people are editing the campaign at once; please try again.".into())
}

/// Provides the shared state and its editor to the tabs inside.
#[component]
pub fn SharedState(
    session: Signal<Option<Session>>,
    campaign_id: String,
    initial: CampaignState,
    initial_version: Option<String>,
    can_edit: bool,
    message: Signal<Option<(String, bool)>>,
    children: Element,
) -> Element {
    let mut state = use_signal(|| initial);
    let version = use_signal(|| initial_version);
    let mut saving = use_signal(|| false);
    let id = use_signal(|| campaign_id);
    let doc = use_memo(move || serde_json::to_value(&*state.read()).unwrap_or_default());

    let change = use_callback(move |(change, done): (DocChange, &'static str)| {
        let mut message = message;
        let mut json = doc.peek().clone();
        change.apply_to(&mut json);
        let Ok(updated) = serde_json::from_value::<CampaignState>(json) else {
            message.set(Some(("That doesn't fit; nothing was saved.".into(), true)));
            return;
        };
        let before = state.peek().clone();
        state.set(updated); // on screen at once
        saving.set(true);
        spawn(async move {
            let campaign_id = id.peek().clone();
            let result = save(session, &campaign_id, &change, state, version).await;
            saving.set(false);
            match result {
                Ok(()) => message.set(Some((done.to_string(), false))),
                Err(e) => {
                    state.set(before);
                    message.set(Some((e.to_string(), true)));
                }
            }
        });
    });

    use_context_provider(|| DocEditor {
        doc,
        saving,
        change,
    });
    use_context_provider(|| Shared {
        state,
        can_edit,
        message,
    });
    rsx! {
        {children}
    }
}

// ---------------------------------------------------------------------------
// Helpers

fn fields_of(value: Value) -> Map<String, Value> {
    match value {
        Value::Object(map) => map,
        _ => Map::new(),
    }
}

fn today_label(state: &CampaignState) -> String {
    state.date.map(ImperialDate::label).unwrap_or_default()
}

fn signed(amount: i64) -> String {
    if amount > 0 {
        format!("+{}", Credits(amount))
    } else {
        Credits(amount).to_string()
    }
}

fn dash(text: &str) -> String {
    if text.trim().is_empty() {
        "—".into()
    } else {
        text.to_string()
    }
}

/// "Edit" / "Done" toggle for a section, shown to members.
#[component]
fn EditToggle(editing: Signal<bool>) -> Element {
    let shared = use_shared();
    let mut editing = editing;
    if !shared.can_edit {
        return rsx! {};
    }
    rsx! {
        div { class: "edit-toggle",
            button {
                class: if editing() { "btn" } else { "btn outline" },
                r#type: "button",
                aria_pressed: editing(),
                onclick: move |_| editing.toggle(),
                if editing() { "Done editing" } else { "Edit" }
            }
        }
    }
}

// ---------------------------------------------------------------------------
// Funds (party funds on the Party tab, the ship fund on the Ship tab) and
// the ship's locker

/// Which account.
#[derive(Clone, Copy, PartialEq, Eq)]
pub enum FundKind {
    /// The party's money.
    Party,
    /// The ship's own account.
    Ship,
}

impl FundKind {
    fn root(self) -> &'static str {
        match self {
            Self::Party => "funds",
            Self::Ship => "ship_fund",
        }
    }
    fn balance_path(self) -> &'static str {
        match self {
            Self::Party => "funds.balance",
            Self::Ship => "ship_fund.balance",
        }
    }
    fn ledger_path(self) -> &'static str {
        match self {
            Self::Party => "funds.ledger",
            Self::Ship => "ship_fund.ledger",
        }
    }
    fn title(self) -> &'static str {
        match self {
            Self::Party => "Party funds",
            Self::Ship => "Ship fund",
        }
    }
    fn id(self) -> &'static str {
        match self {
            Self::Party => "party",
            Self::Ship => "ship",
        }
    }
    fn of(self, state: &CampaignState) -> &Funds {
        match self {
            Self::Party => &state.funds,
            Self::Ship => &state.ship_fund,
        }
    }
}

/// A fund: balance, quick spend/receive, and its ledger.
#[component]
pub fn Fund(kind: FundKind) -> Element {
    let shared = use_shared();
    let doc = use_context::<DocEditor>();
    let editing = use_signal(|| false);
    let mut amount = use_signal(String::new);
    let mut what = use_signal(String::new);
    let state = shared.state.read().clone();
    let funds = kind.of(&state).clone();
    let busy = (doc.saving)();
    let id = kind.id();

    let record = use_callback(move |sign: i64| {
        let mut message = shared.message;
        let Some(value) = fields::whole(&amount(), "Amount", 1, 1_000_000_000_000).ok() else {
            message.set(Some((
                "Enter an amount in credits, e.g. 1500.".into(),
                true,
            )));
            return;
        };
        let description = match what().trim() {
            "" if sign < 0 => "Spent".to_string(),
            "" => "Received".to_string(),
            text => text.to_string(),
        };
        let date = today_label(&shared.state.peek());
        doc.change.call((
            DocChange::Batch(vec![
                DocChange::Increment {
                    path: kind.balance_path(),
                    by: value * sign,
                },
                DocChange::Upsert {
                    path: kind.ledger_path(),
                    target: Target::New(new_id()),
                    fields: fields_of(
                        json!({ "date": date, "description": description, "amount": value * sign }),
                    ),
                },
            ]),
            "Funds updated.",
        ));
        amount.set(String::new());
        what.set(String::new());
    });

    rsx! {
        section { aria_labelledby: "fund-{id}",
            div { class: "edit-head",
                h2 { id: "fund-{id}", class: "section", "{kind.title()}" }
                span { class: if funds.balance < 0 { "big-figure neg" } else { "big-figure" }, {Credits(funds.balance).to_string()} }
            }
            if shared.can_edit {
                form { class: "edit-form", onsubmit: move |e: FormEvent| { e.prevent_default(); record.call(-1); },
                    div { class: "inline wrap",
                        label { class: "sr-only", r#for: "{id}-cr", "Amount in credits" }
                        input { id: "{id}-cr", r#type: "text", inputmode: "numeric", placeholder: "Cr",
                            value: "{amount}", oninput: move |e| amount.set(e.value()) }
                        label { class: "sr-only", r#for: "{id}-what", "What for" }
                        input { id: "{id}-what", r#type: "text", placeholder: "What for", maxlength: "120",
                            value: "{what}", oninput: move |e| what.set(e.value()) }
                        button { class: "btn", r#type: "submit", disabled: busy, "Spend" }
                        button { class: "btn outline", r#type: "button", disabled: busy, onclick: move |_| record.call(1), "Receive" }
                    }
                }
            }
            EditToggle { editing }
            if editing() {
                SectionEditor { path: kind.root(), title: "Balance", fields: fields::FUNDS }
                ListEditor { path: kind.ledger_path(), title: "Ledger", fields: fields::FUNDS_LEDGER, ids: true }
            } else if funds.ledger.is_empty() {
                p { class: "muted", "No transactions yet." }
            } else {
                div { class: "scroll",
                    table { class: "data",
                        thead { tr {
                            th { scope: "col", "Date" }
                            th { scope: "col", "Entry" }
                            th { scope: "col", "By" }
                            th { scope: "col", class: "num", "Amount" }
                        } }
                        tbody {
                            for entry in funds.ledger.iter().rev() {
                                tr { key: "{entry.id}",
                                    td { class: "muted", {dash(&entry.date)} }
                                    td { "{entry.description}"
                                        if !entry.category.is_empty() { br {} span { class: "muted small", "{entry.category}" } }
                                        if !entry.notes.is_empty() { br {} span { class: "muted small", "{entry.notes}" } }
                                    }
                                    td { class: "muted", {dash(&entry.by)} }
                                    td { class: if entry.amount < 0 { "num strong neg" } else { "num strong pos" }, {signed(entry.amount)} }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

/// Shared gear in the ship's locker.
#[component]
pub fn Locker() -> Element {
    let shared = use_shared();
    let editing = use_signal(|| false);
    let state = shared.state.read().clone();
    rsx! {
        section { aria_labelledby: "locker",
            h2 { id: "locker", class: "section", "Ship's locker" }
            EditToggle { editing }
            if editing() {
                ListEditor { path: "locker", title: "Items", fields: fields::LOCKER, ids: true,
                    catalogue: Pick::Locker, pay: CAMPAIGN_SOURCES }
            } else {
                if state.locker.is_empty() {
                    p { class: "muted", "Nothing in the locker yet." }
                } else {
                    table { class: "data",
                        thead { tr { th { scope: "col", "Item" } th { scope: "col", class: "num", "Qty" } th { scope: "col", "Signed out to" } } }
                        tbody {
                            for item in state.locker.iter() {
                                tr { key: "{item.id}",
                                    td { "{item.name}" }
                                    td { class: "num", "{item.quantity}" }
                                    td { class: if item.signed_out_to.is_empty() { "muted" } else { "" },
                                        {if item.signed_out_to.is_empty() { "In the locker".to_string() } else { item.signed_out_to.clone() }}
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

// ---------------------------------------------------------------------------
// Ship

#[component]
pub fn ShipTab() -> Element {
    let shared = use_shared();
    let doc = use_context::<DocEditor>();
    let editing = use_signal(|| false);
    let state = shared.state.read().clone();
    let ship = &state.ship;
    let costs = ship.running_costs();
    let busy = (doc.saving)();

    let pay = move |_| {
        let s = shared.state.peek().clone();
        let costs = s.ship.running_costs();
        let mortgage = costs.mortgage.0.min(s.ship.mortgage_remaining.max(0));
        let total = costs.total().0 - costs.mortgage.0 + mortgage;
        doc.change.call((
            DocChange::Batch(vec![
                DocChange::Increment {
                    path: FundKind::Ship.balance_path(),
                    by: -total,
                },
                DocChange::Increment {
                    path: "ship.mortgage_remaining",
                    by: -mortgage,
                },
                DocChange::Upsert {
                    path: FundKind::Ship.ledger_path(),
                    target: Target::New(new_id()),
                    fields: fields_of(json!({
                        "date": today_label(&s),
                        "description": "Running costs (mortgage, maintenance, life support, salaries)",
                        "category": "Expense / Running costs",
                        "amount": -total,
                    })),
                },
            ]),
            "Running costs paid from the ship fund.",
        ));
    };

    let set_up = !ship.name.is_empty() || ship.tons > 0;
    rsx! {
        div { class: "edit-head",
            h2 { class: "section",
                if set_up { "{dash(&ship.name)}" } else { "The ship" }
                if !ship.class.is_empty() { span { class: "accent", " · {ship.class}" } }
            }
            span { class: "muted",
                {[
                    (ship.tons > 0).then(|| format!("{} tons", ship.tons)),
                    ship.tl.map(|t| format!("TL{t}")),
                    (!ship.configuration.is_empty()).then(|| ship.configuration.clone()),
                ].into_iter().flatten().collect::<Vec<_>>().join(" · ")}
            }
        }
        Fund { kind: FundKind::Ship }
        h2 { class: "section", "Ship details" }
        EditToggle { editing }
        if editing() {
            SectionEditor { path: "ship", title: "Ship", fields: fields::SHIP }
            ListEditor { path: "ship.crew", title: "Crew positions", fields: fields::CREW, ids: true }
        } else if !set_up {
            p { class: "muted", "No ship recorded yet. Use Edit to add your ship's details." }
        } else {
            div { class: "readouts",
                div { p { class: "readout-label", "HULL" } p { class: if ship.hull_now() < ship.hull_max { "readout neg" } else { "readout" }, "{ship.hull_now()} / {ship.hull_max}" } }
                div { p { class: "readout-label", "FUEL" } p { class: "readout", "{ship.fuel} / {ship.fuel_capacity} t" }
                    p { class: "muted small", "Jump-1 uses {ship.jump_fuel(1)} t" } }
                div { p { class: "readout-label", "CARGO" } p { class: "readout", "{state.cargo_tons()} / {ship.cargo_capacity} t" } }
                div { p { class: "readout-label", "DRIVES" } p { class: "readout", "J-{ship.jump} · M-{ship.thrust}" } }
                div { p { class: "readout-label", "ARMOUR" } p { class: "readout", "{ship.armour}" } }
            }
            div { class: "columns",
                section { aria_labelledby: "costs",
                    h3 { id: "costs", class: "section", "Running costs" }
                    p { class: "muted small", "Per maintenance period of four weeks (Core p.149, p.154)." }
                    table { class: "data summary",
                        tbody {
                            tr { th { scope: "row", "Mortgage" } td { class: "num", {costs.mortgage.to_string()} } }
                            tr { th { scope: "row", "Maintenance" } td { class: "num", {costs.maintenance.to_string()} } }
                            tr { th { scope: "row", "Life support" } td { class: "num", {costs.life_support.to_string()} } }
                            tr { th { scope: "row", "Crew salaries" } td { class: "num", {costs.salaries.to_string()} } }
                            tr { th { scope: "row", strong { "Total" } } td { class: "num strong", {costs.total().to_string()} } }
                            tr { th { scope: "row", "Mortgage still owed" } td { class: "num neg", {Credits(ship.mortgage_remaining).to_string()} } }
                        }
                    }
                    if shared.can_edit {
                        button { class: "btn", r#type: "button", disabled: busy, onclick: pay, "Pay running costs" }
                    }
                }
                section { aria_labelledby: "crew",
                    h3 { id: "crew", class: "section", "Crew positions" }
                    if ship.crew.is_empty() {
                        p { class: "muted", "No positions recorded." }
                    } else {
                        table { class: "data",
                            thead { tr { th { scope: "col", "Position" } th { scope: "col", "Filled by" } th { scope: "col", "Skill" } } }
                            tbody {
                                for c in ship.crew.iter() {
                                    tr { key: "{c.id}",
                                        td { "{c.role}" }
                                        td { class: if c.filled_by.is_empty() { "strong neg" } else { "strong" },
                                            {if c.filled_by.is_empty() { "Vacant".to_string() } else { c.filled_by.clone() }} }
                                        td { class: "muted", {dash(&c.skill)} }
                                    }
                                }
                            }
                        }
                    }
                }
            }
            if !ship.systems.is_empty() || !ship.weapons.is_empty() {
                div { class: "columns",
                    section { h3 { class: "section", "Systems" } p { class: "prose", {dash(&ship.systems)} } }
                    section { h3 { class: "section", "Weapons" } p { class: "prose", {dash(&ship.weapons)} } }
                }
            }
        }
    }
}

// ---------------------------------------------------------------------------
// Cargo & trade

#[component]
pub fn CargoTab() -> Element {
    let shared = use_shared();
    let editing = use_signal(|| false);
    let state = shared.state.read().clone();
    let profit: i64 = state.trades.iter().map(|t| t.total().0).sum();

    rsx! {
        div { class: "edit-head",
            h2 { class: "section", "Cargo hold" }
            span { class: "muted", strong { "{state.cargo_tons()}" } " of {state.ship.cargo_capacity} tons used" }
        }
        EditToggle { editing }
        if editing() {
            ListEditor { path: "cargo", title: "Cargo", fields: fields::CARGO, ids: true,
                catalogue: Pick::Cargo, pay: CAMPAIGN_SOURCES }
            ListEditor { path: "contracts", title: "Contracts", fields: fields::CONTRACTS, ids: true }
            ListEditor { path: "trades", title: "Trades", fields: fields::TRADES, ids: true }
        } else {
            if state.cargo.is_empty() {
                p { class: "muted", "The hold is empty." }
            } else {
                div { class: "scroll",
                    table { class: "data",
                        thead { tr { th { scope: "col", "Goods" } th { scope: "col", class: "num", "Tons" } th { scope: "col", class: "num", "Paid" } th { scope: "col", "Bought at" } th { scope: "col", "Bound for" } } }
                        tbody {
                            for c in state.cargo.iter() {
                                tr { key: "{c.id}",
                                    td { class: "strong", "{c.goods}" }
                                    td { class: "num", "{c.tons}" }
                                    td { class: "num", {Credits(c.paid).to_string()} }
                                    td { {dash(&c.bought_at)} }
                                    td { {dash(&c.destination)} }
                                }
                            }
                        }
                    }
                }
            }
            h2 { class: "section", "Contracts" }
            if state.contracts.is_empty() {
                p { class: "muted", "No freight, passengers or mail booked." }
            } else {
                div { class: "scroll",
                    table { class: "data",
                        thead { tr { th { scope: "col", "Contract" } th { scope: "col", class: "num", "Tons" } th { scope: "col", class: "num", "Payment" } th { scope: "col", "To" } th { scope: "col", "Status" } } }
                        tbody {
                            for c in state.contracts.iter() {
                                tr { key: "{c.id}",
                                    td { strong { "{c.description}" } br {} span { class: "muted small", "{c.kind.label()}" } }
                                    td { class: "num", {c.tons.map_or_else(|| "—".into(), |t| t.to_string())} }
                                    td { class: "num", {Credits(c.payment).to_string()} }
                                    td { {dash(&c.destination)} }
                                    td { class: if c.status == ContractStatus::Delivered { "muted" } else { "strong" }, "{c.status.label()}" }
                                }
                            }
                        }
                    }
                }
            }
            div { class: "edit-head",
                h2 { class: "section", "Trades" }
                if !state.trades.is_empty() {
                    span { class: if profit < 0 { "neg strong" } else { "pos strong" }, "Net {signed(profit)}" }
                }
            }
            if state.trades.is_empty() {
                p { class: "muted", "No trades logged yet." }
            } else {
                div { class: "scroll",
                    table { class: "data",
                        thead { tr { th { scope: "col", "Date" } th { scope: "col", "World" } th { scope: "col", "Deal" } th { scope: "col", class: "num", "Tons" } th { scope: "col", class: "num", "Per ton" } th { scope: "col", class: "num", "Total" } th { scope: "col", "By" } } }
                        tbody {
                            for t in state.trades.iter().rev() {
                                tr { key: "{t.id}",
                                    td { class: "muted", {dash(&t.date)} }
                                    td { {dash(&t.world)} }
                                    td { {if t.side == TradeSide::Buy { "Bought " } else { "Sold " }} strong { "{t.goods}" } }
                                    td { class: "num", "{t.tons}" }
                                    td { class: "num", {Credits(t.price_per_ton).to_string()} }
                                    td { class: if t.total().0 < 0 { "num neg" } else { "num pos" }, {signed(t.total().0)} }
                                    td { class: "muted", {dash(&t.by)} }
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
// Travel & log

#[component]
pub fn TravelTab() -> Element {
    let shared = use_shared();
    let doc = use_context::<DocEditor>();
    let editing = use_signal(|| false);
    let state = shared.state.read().clone();
    let travel = &state.travel;
    let parsecs = travel.next_parsecs.unwrap_or(1).max(1);
    let fuel_needed = state.ship.jump_fuel(parsecs);
    let can_jump = !travel.next_destination.is_empty()
        && state.ship.fuel >= fuel_needed
        && state.ship.tons > 0;
    let busy = (doc.saving)();

    // A week in jump space (Core p.153): fuel used, arrival, journal entry.
    let jump = move |_| {
        let s = shared.state.peek().clone();
        let parsecs = s.travel.next_parsecs.unwrap_or(1).max(1);
        let fuel = s.ship.jump_fuel(parsecs);
        let destination = s.travel.next_destination.clone();
        let arrival = s.date.map(|d| d.plus_days(7));
        let mut changes = vec![
            DocChange::Increment {
                path: "ship.fuel",
                by: -i64::from(fuel),
            },
            DocChange::Set {
                path: "",
                fields: fields_of(json!({ "location": destination })),
            },
            DocChange::Set {
                path: "travel",
                fields: fields_of(json!({ "next_destination": "", "next_parsecs": null })),
            },
            DocChange::Upsert {
                path: "travel.journal",
                target: Target::New(new_id()),
                fields: fields_of(json!({
                    "date": arrival.map(ImperialDate::label).unwrap_or_default(),
                    "title": format!("Jumped to {destination}"),
                    "text": format!("Jump-{parsecs}, using {fuel} tons of fuel."),
                })),
            },
        ];
        if let Some(date) = arrival {
            changes.push(DocChange::Set {
                path: "date",
                fields: fields_of(json!({ "day": date.day, "year": date.year })),
            });
        }
        doc.change
            .call((DocChange::Batch(changes), "Jump complete."));
    };

    let advance = move |days: u32| {
        let s = shared.state.peek().clone();
        if let Some(date) = s.date.map(|d| d.plus_days(days)) {
            doc.change.call((
                DocChange::Set {
                    path: "date",
                    fields: fields_of(json!({ "day": date.day, "year": date.year })),
                },
                "Date advanced.",
            ));
        }
    };

    rsx! {
        div { class: "readouts",
            div { p { class: "readout-label", "DATE" } p { class: "readout", {state.date.map_or_else(|| "—".to_string(), ImperialDate::label)} } }
            div { p { class: "readout-label", "LOCATION" } p { class: "readout", {dash(&state.location)} } }
            div { p { class: "readout-label", "NEXT JUMP" } p { class: "readout", {dash(&travel.next_destination)} }
                if !travel.next_destination.is_empty() {
                    p { class: "muted small", "Jump-{parsecs} · needs {fuel_needed} t of fuel ({state.ship.fuel} t aboard)" }
                }
            }
        }
        if shared.can_edit && !editing() {
            div { class: "inline wrap",
                button { class: "btn", r#type: "button", disabled: busy || !can_jump, onclick: jump,
                    if travel.next_destination.is_empty() { "Jump" } else { "Jump to {travel.next_destination}" }
                }
                button { class: "btn outline", r#type: "button", disabled: busy || state.date.is_none(), onclick: move |_| advance(1), "+1 day" }
                button { class: "btn outline", r#type: "button", disabled: busy || state.date.is_none(), onclick: move |_| advance(7), "+1 week" }
            }
            if !travel.next_destination.is_empty() && state.ship.fuel < fuel_needed {
                p { class: "notice", "Not enough fuel for this jump: refuel first (Ship tab, Edit)." }
            }
        }
        EditToggle { editing }
        if editing() {
            SectionEditor { path: "date", title: "Imperial date", fields: fields::DATE }
            SectionEditor { path: "", title: "Location", fields: fields::WHERE_AND_WHEN }
            SectionEditor { path: "travel", title: "Next jump", fields: fields::NEXT_JUMP }
            ListEditor { path: "travel.missions", title: "Patrons & missions", fields: fields::MISSIONS, ids: true }
            ListEditor { path: "travel.worlds", title: "Worlds visited", fields: fields::WORLDS, ids: true }
            ListEditor { path: "travel.journal", title: "Journal", fields: fields::JOURNAL, ids: true }
        } else {
            div { class: "columns",
                section { aria_labelledby: "missions",
                    h2 { id: "missions", class: "section", "Patrons & missions" }
                    if travel.missions.is_empty() {
                        p { class: "muted", "No jobs yet." }
                    } else {
                        table { class: "data",
                            thead { tr { th { scope: "col", "Job" } th { scope: "col", class: "num", "Reward" } th { scope: "col", "Status" } } }
                            tbody {
                                for m in travel.missions.iter() {
                                    tr { key: "{m.id}",
                                        td { strong { "{m.job}" } if !m.patron.is_empty() { br {} span { class: "muted small", "for {m.patron}" } } }
                                        td { class: "num", {m.reward.map_or_else(|| "—".to_string(), |r| Credits(r).to_string())} }
                                        td { {dash(&m.status)} }
                                    }
                                }
                            }
                        }
                    }
                }
                section { aria_labelledby: "worlds",
                    h2 { id: "worlds", class: "section", "Worlds visited" }
                    if travel.worlds.is_empty() {
                        p { class: "muted", "No worlds recorded yet." }
                    } else {
                        table { class: "data",
                            thead { tr { th { scope: "col", "World" } th { scope: "col", Tip { text: glossary::UWP, "UWP" } } th { scope: "col", "Notes" } } }
                            tbody {
                                for w in travel.worlds.iter() {
                                    tr { key: "{w.id}",
                                        td { class: "strong", "{w.name}" }
                                        td { class: "upp", {dash(&w.uwp)} }
                                        td { class: "muted", {dash(&w.notes)} }
                                    }
                                }
                            }
                        }
                    }
                }
            }
            h2 { class: "section", "Journal" }
            if travel.journal.is_empty() {
                p { class: "muted", "No entries yet." }
            } else {
                for entry in travel.journal.iter().rev() {
                    article { key: "{entry.id}", class: "journal-entry",
                        p { class: "journal-date", {dash(&entry.date)} }
                        div {
                            h3 { "{entry.title}" }
                            if !entry.text.is_empty() { p { class: "prose muted", "{entry.text}" } }
                            if !entry.by.is_empty() { p { class: "small muted", "— {entry.by}" } }
                        }
                    }
                }
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn money_and_text_helpers() {
        assert_eq!(signed(500), "+Cr500");
        assert_eq!(signed(-500), "\u{2212}Cr500");
        assert_eq!(dash("  "), "—");
        assert_eq!(today_label(&CampaignState::default()), "");
    }

    #[test]
    fn spending_replays_on_top_of_a_newer_save() {
        // What a Spend button sends, applied to state someone else changed.
        let spend = DocChange::Batch(vec![
            DocChange::Increment {
                path: "funds.balance",
                by: -500,
            },
            DocChange::Upsert {
                path: "funds.ledger",
                target: Target::New("e1".into()),
                fields: fields_of(json!({ "description": "Fuel", "amount": -500 })),
            },
        ]);
        let mut newer = serde_json::to_value(CampaignState::default()).unwrap();
        newer["funds"]["balance"] = json!(1000);
        spend.apply_to(&mut newer);
        let state: CampaignState = serde_json::from_value(newer).unwrap();
        assert_eq!(state.funds.balance, 500);
        assert_eq!(state.funds.ledger.len(), 1);
    }
}
