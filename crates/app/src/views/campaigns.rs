//! Campaigns: the list, creating one, and a campaign's Party and Members
//! tabs (roles, invitations, settings).
//!
//! What each person can do is decided by the database (Row Level Security
//! and the invite-user function); the page only hides controls that would
//! be refused anyway.

use std::collections::HashMap;

use dioxus::prelude::*;
use traveller_model::{
    CampaignRow, CampaignState, CharacterRow, InvitationRow, MemberRow, ProfileRow,
};
use traveller_rules::Characteristic;
use traveller_rules::characteristics::Condition;

use super::shared::{CargoTab, PartyFunds, SharedState, ShipTab, TravelTab, load_state};
use super::tip::{Tip, glossary};
use super::{EdgeTab, fresh_session, is_uuid, use_session};
use crate::Route;
use crate::session::Session;
use crate::supabase::{self, Error};

// ---------------------------------------------------------------------------
// Campaign list

#[derive(Clone, PartialEq)]
struct ListEntry {
    campaign: CampaignRow,
    roles: String,
}

/// `/campaigns`
#[component]
pub fn Campaigns() -> Element {
    let session = use_session();
    let mut creating = use_signal(|| false);
    let campaigns = use_resource(move || async move {
        let current = fresh_session(session).await?;
        let campaigns: Vec<CampaignRow> = supabase::get(
            &current,
            &format!("campaigns?select={}&order=name", CampaignRow::COLUMNS),
        )
        .await?;
        let mine: Vec<MemberRow> = supabase::get(
            &current,
            &format!(
                "campaign_members?select={}&user_id=eq.{}",
                MemberRow::COLUMNS,
                current.user_id
            ),
        )
        .await?;
        Ok::<_, Error>(
            campaigns
                .into_iter()
                .map(|c| {
                    let roles = mine
                        .iter()
                        .find(|m| m.campaign_id == c.id)
                        .map_or_else(|| "Creator".to_string(), MemberRow::roles_label);
                    ListEntry { campaign: c, roles }
                })
                .collect::<Vec<_>>(),
        )
    });

    rsx! {
        main { class: "page",
            EdgeTab { label: "Campaigns" }
            div { class: "page-head",
                h1 { class: "display", "Campaigns" }
                if !creating() {
                    button { class: "btn", r#type: "button", onclick: move |_| creating.set(true), "New campaign" }
                }
            }
            if creating() {
                NewCampaign { on_cancel: move |()| creating.set(false) }
            }
            match &*campaigns.read() {
                None => rsx! { p { class: "muted", "Loading…" } },
                Some(Err(e)) => rsx! { p { class: "error", role: "alert", "{e}" } },
                Some(Ok(list)) if list.is_empty() => rsx! {
                    p { class: "muted", "You're not in any campaigns yet. Create one, or accept an invitation on the Home page." }
                },
                Some(Ok(list)) => rsx! {
                    table { class: "data",
                        thead { tr { th { scope: "col", "Campaign" } th { scope: "col", "Your role" } } }
                        tbody {
                            for entry in list.iter() {
                                tr { key: "{entry.campaign.id}",
                                    td {
                                        Link { class: "strong", to: Route::Campaign { id: entry.campaign.id.clone() }, "{entry.campaign.name}" }
                                        if let Some(d) = entry.campaign.description.as_deref().filter(|d| !d.is_empty()) {
                                            br {}
                                            span { class: "muted small", "{d}" }
                                        }
                                    }
                                    td { class: "muted", "{entry.roles}" }
                                }
                            }
                        }
                    }
                },
            }
        }
    }
}

#[component]
fn NewCampaign(on_cancel: EventHandler<()>) -> Element {
    let session = use_session();
    let navigator = use_navigator();
    let mut name = use_signal(String::new);
    let mut description = use_signal(String::new);
    let mut referee = use_signal(|| true);
    let mut error = use_signal(|| None::<String>);
    let mut busy = use_signal(|| false);

    let create = move |evt: FormEvent| {
        evt.prevent_default();
        let trimmed = name().trim().to_string();
        if trimmed.is_empty() || trimmed.chars().count() > 120 {
            error.set(Some(
                "Give the campaign a name (up to 120 characters).".into(),
            ));
            return;
        }
        let about = description().trim().to_string();
        if about.chars().count() > 1000 {
            error.set(Some(
                "The description is too long (at most 1000 characters).".into(),
            ));
            return;
        }
        let as_referee = referee();
        busy.set(true);
        error.set(None);
        spawn(async move {
            let result = async {
                let current = fresh_session(session).await?;
                let rows: Vec<CampaignRow> = supabase::post(
                    &current,
                    &format!("campaigns?select={}", CampaignRow::COLUMNS),
                    &serde_json::json!({
                        "name": trimmed,
                        "description": if about.is_empty() { None } else { Some(about) },
                        "created_by": current.user_id,
                    }),
                )
                .await?;
                let campaign = rows.into_iter().next().ok_or(Error::Server)?;
                // The creator joins as admin (and referee, unless they said not).
                let _: Vec<serde_json::Value> = supabase::post(
                    &current,
                    "campaign_members?select=id",
                    &serde_json::json!({
                        "campaign_id": campaign.id,
                        "user_id": current.user_id,
                        "is_admin": true,
                        "is_gm": as_referee,
                        "is_player": !as_referee,
                    }),
                )
                .await?;
                Ok::<_, Error>(campaign)
            }
            .await;
            busy.set(false);
            match result {
                Ok(c) => {
                    navigator.push(Route::Campaign { id: c.id });
                }
                Err(e) => error.set(Some(e.to_string())),
            }
        });
    };

    rsx! {
        form { class: "edit-form", onsubmit: create,
            h2 { class: "section", "New campaign" }
            div { class: "field wide",
                label { r#for: "camp-name", "Name" }
                input { id: "camp-name", r#type: "text", maxlength: "120", required: true,
                    value: "{name}", oninput: move |e| name.set(e.value()) }
            }
            div { class: "field wide",
                label { r#for: "camp-about", "Description (optional)" }
                textarea { id: "camp-about", rows: "2", maxlength: "1000",
                    value: "{description}", oninput: move |e| description.set(e.value()) }
            }
            div { class: "field wide",
                label { class: "check",
                    input { r#type: "checkbox", checked: referee(), onchange: move |e| referee.set(e.checked()) }
                    "I'm the referee"
                }
            }
            if let Some(message) = error() {
                p { class: "error", role: "alert", "{message}" }
            }
            div { class: "inline",
                button { class: "btn", r#type: "submit", disabled: busy(),
                    if busy() { "Creating…" } else { "Create campaign" }
                }
                button { class: "btn outline", r#type: "button", onclick: move |_| on_cancel.call(()), "Cancel" }
            }
        }
    }
}

// ---------------------------------------------------------------------------
// One campaign

/// Everything a campaign page shows.
#[derive(Clone, PartialEq)]
struct CampaignData {
    campaign: CampaignRow,
    members: Vec<MemberRow>,
    names: HashMap<String, String>,
    characters: Vec<CharacterRow>,
    /// The signed-in user's characters not in any campaign.
    unassigned: Vec<CharacterRow>,
    /// Pending invitations; admins only.
    invitations: Vec<InvitationRow>,
    me: String,
    /// The shared state and its version; `None` until migration 08 is
    /// applied.
    state: Option<(CampaignState, String)>,
}

impl CampaignData {
    fn my_membership(&self) -> Option<&MemberRow> {
        self.members.iter().find(|m| m.user_id == self.me)
    }
    fn is_creator(&self) -> bool {
        self.campaign.created_by == self.me
    }
    fn is_admin(&self) -> bool {
        self.is_creator() || self.my_membership().is_some_and(|m| m.is_admin)
    }
    fn is_referee(&self) -> bool {
        self.my_membership().is_some_and(|m| m.is_gm)
    }
    fn name_of(&self, user_id: &str) -> String {
        self.names
            .get(user_id)
            .cloned()
            .unwrap_or_else(|| "A traveller".into())
    }
}

async fn load_campaign(
    session: Signal<Option<Session>>,
    id: String,
) -> Result<Option<CampaignData>, Error> {
    if !is_uuid(&id) {
        return Ok(None);
    }
    let current = fresh_session(session).await?;
    let Some(campaign) = supabase::get::<Vec<CampaignRow>>(
        &current,
        &format!("campaigns?select={}&id=eq.{id}", CampaignRow::COLUMNS),
    )
    .await?
    .into_iter()
    .next() else {
        return Ok(None);
    };

    let members: Vec<MemberRow> = supabase::get(
        &current,
        &format!(
            "campaign_members?select={}&campaign_id=eq.{id}",
            MemberRow::COLUMNS
        ),
    )
    .await?;

    // Ids come from the database, but check them before building a filter.
    let ids: Vec<&str> = members
        .iter()
        .map(|m| m.user_id.as_str())
        .chain(std::iter::once(campaign.created_by.as_str()))
        .filter(|u| is_uuid(u))
        .collect();
    let profiles: Vec<ProfileRow> = if ids.is_empty() {
        Vec::new()
    } else {
        supabase::get(
            &current,
            &format!(
                "user_profiles?select={}&id=in.({})",
                ProfileRow::COLUMNS,
                ids.join(",")
            ),
        )
        .await?
    };
    let names = profiles
        .into_iter()
        .map(|p| (p.id.clone(), p.name().to_string()))
        .collect();

    let characters: Vec<CharacterRow> = supabase::get(
        &current,
        &format!(
            "characters?select={}&campaign_id=eq.{id}&order=name",
            CharacterRow::COLUMNS
        ),
    )
    .await?;
    let unassigned: Vec<CharacterRow> = supabase::get(
        &current,
        &format!(
            "characters?select={}&owner_id=eq.{}&campaign_id=is.null&order=name",
            CharacterRow::COLUMNS,
            current.user_id
        ),
    )
    .await?;

    let state = load_state(&current, &id).await?;

    let mut data = CampaignData {
        campaign,
        members,
        names,
        characters,
        unassigned,
        invitations: Vec::new(),
        me: current.user_id.clone(),
        state,
    };
    if data.is_admin() {
        data.invitations = supabase::get(
            &current,
            &format!(
                "campaign_invitations?select={}&campaign_id=eq.{id}&status=eq.pending&order=created_at.desc",
                InvitationRow::COLUMNS
            ),
        )
        .await
        .unwrap_or_default();
    }
    Ok(Some(data))
}

#[derive(Clone, Copy, PartialEq, Eq)]
enum Tab {
    Party,
    Ship,
    Cargo,
    Travel,
    Members,
}

impl Tab {
    const ALL: [Self; 5] = [
        Self::Party,
        Self::Ship,
        Self::Cargo,
        Self::Travel,
        Self::Members,
    ];
    fn label(self) -> &'static str {
        match self {
            Self::Party => "Party",
            Self::Ship => "Ship",
            Self::Cargo => "Cargo & trade",
            Self::Travel => "Travel & log",
            Self::Members => "Members",
        }
    }
    fn id(self) -> &'static str {
        match self {
            Self::Party => "party",
            Self::Ship => "ship",
            Self::Cargo => "cargo",
            Self::Travel => "travel",
            Self::Members => "members",
        }
    }
}

/// Messages and reloading, shared by the campaign page's actions.
#[derive(Clone, Copy, PartialEq)]
struct Actions {
    session: Signal<Option<Session>>,
    message: Signal<Option<(String, bool)>>,
    busy: Signal<bool>,
    reload: Callback<()>,
}

impl Actions {
    /// Runs an action, then shows `done` (or the error) and reloads.
    fn run<F>(mut self, done: &'static str, action: impl FnOnce(Session) -> F + 'static)
    where
        F: std::future::Future<Output = Result<(), Error>> + 'static,
    {
        if (self.busy)() {
            return;
        }
        self.busy.set(true);
        spawn(async move {
            let result = match fresh_session(self.session).await {
                Ok(current) => action(current).await,
                Err(e) => Err(e),
            };
            self.busy.set(false);
            match result {
                Ok(()) => self.message.set(Some((done.to_string(), false))),
                Err(e) => self.message.set(Some((e.to_string(), true))),
            }
            self.reload.call(());
        });
    }
}

/// `/campaigns/:id`
#[component]
pub fn Campaign(id: String) -> Element {
    let session = use_session();
    let mut page = use_resource(use_reactive!(|id| load_campaign(session, id)));
    let reload = use_callback(move |()| page.restart());
    let message = use_signal(|| None::<(String, bool)>);
    let busy = use_signal(|| false);
    let actions = Actions {
        session,
        message,
        busy,
        reload,
    };
    let mut tab = use_signal(|| Tab::Party);

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
        main { class: "page",
            EdgeTab { label: "Campaigns" }
            match &*page.read() {
                None => rsx! { p { class: "muted", "Loading…" } },
                Some(Err(e)) => rsx! { p { class: "error", role: "alert", "{e}" } },
                Some(Ok(None)) => rsx! {
                    h1 { class: "display", "Not found" }
                    p { class: "muted", "This campaign doesn't exist, or you're not a member." }
                },
                Some(Ok(Some(data))) => rsx! {
                    div { class: "sheet-head",
                        div {
                            p { class: "label", "CAMPAIGN" }
                            h1 { class: "display", "{data.campaign.name}" }
                            if let Some(d) = data.campaign.description.as_deref().filter(|d| !d.is_empty()) {
                                p { class: "muted", "{d}" }
                            }
                        }
                        p { class: "muted",
                            "Referee: "
                            strong {
                                {
                                    let refs: Vec<String> = data.members.iter().filter(|m| m.is_gm).map(|m| data.name_of(&m.user_id)).collect();
                                    if refs.is_empty() { "none yet".to_string() } else { refs.join(", ") }
                                }
                            }
                        }
                    }
                    if let Some((text, is_error)) = message() {
                        div { class: if is_error { "notice error-notice" } else { "notice ok-notice" },
                            role: if is_error { "alert" } else { "status" },
                            span { "{text}" }
                            button { class: "link-button", r#type: "button", aria_label: "Dismiss",
                                onclick: move |_| { let mut m = message; m.set(None); }, "\u{00d7}" }
                        }
                    }
                    div { class: "tabs", role: "tablist", aria_label: "Campaign sections", onkeydown: on_key,
                        for t in Tab::ALL {
                            button { key: "{t.id()}", id: "ctab-{t.id()}", class: "tab", r#type: "button", role: "tab",
                                aria_selected: tab() == t, aria_controls: "cpanel-{t.id()}",
                                tabindex: if tab() == t { "0" } else { "-1" },
                                onclick: move |_| tab.set(t), "{t.label()}" }
                        }
                    }
                    div { id: "cpanel-{tab().id()}", role: "tabpanel", aria_labelledby: "ctab-{tab().id()}",
                        match (tab(), data.state.clone()) {
                            (Tab::Members, _) => rsx! { Members { data: data.clone(), actions } },
                            (Tab::Party, None) => rsx! { Party { data: data.clone(), actions } },
                            (_, None) => rsx! {
                                p { class: "notice", "Shared campaign data isn't set up on the server yet (database migration 08)." }
                            },
                            (current_tab, Some((state, version))) => rsx! {
                                SharedState {
                                    key: "{data.campaign.id}",
                                    session,
                                    campaign_id: data.campaign.id.clone(),
                                    initial: state,
                                    initial_version: Some(version),
                                    can_edit: data.my_membership().is_some() || data.is_creator(),
                                    message,
                                    match current_tab {
                                        Tab::Party => rsx! {
                                            Party { data: data.clone(), actions }
                                            PartyFunds {}
                                        },
                                        Tab::Ship => rsx! { ShipTab {} },
                                        Tab::Cargo => rsx! { CargoTab {} },
                                        _ => rsx! { TravelTab {} },
                                    }
                                }
                            },
                        }
                    }
                },
            }
        }
    }
}

// ---------------------------------------------------------------------------
// Party

fn condition(row: &CharacterRow) -> (String, bool) {
    let Some(stats) = row.characteristics else {
        return ("—".into(), false);
    };
    match stats.condition() {
        Condition::Dead => return ("Dead".into(), true),
        Condition::Unconscious => return ("Unconscious".into(), true),
        Condition::Conscious => {}
    }
    let hurt: Vec<String> = [
        Characteristic::Str,
        Characteristic::Dex,
        Characteristic::End,
    ]
    .iter()
    .filter_map(|&c| {
        let s = stats.get(c);
        s.is_reduced()
            .then(|| format!("{c} {} of {}", s.current(), s.value))
    })
    .collect();
    if hurt.is_empty() {
        ("Fit".into(), false)
    } else {
        (hurt.join(", "), true)
    }
}

#[component]
fn Party(data: CampaignData, actions: Actions) -> Element {
    let this_campaign = data.campaign.id.clone();
    let mut chosen = use_signal(String::new);
    let busy = (actions.busy)();
    let is_member = data.my_membership().is_some();

    let add = move |evt: FormEvent| {
        evt.prevent_default();
        let character = chosen();
        if !is_uuid(&character) {
            return;
        }
        let campaign_id = this_campaign.clone();
        actions.run(
            "Character added to the campaign.",
            move |current| async move {
                let rows: Vec<serde_json::Value> = supabase::patch(
                    &current,
                    &format!("characters?id=eq.{character}&select=id"),
                    &serde_json::json!({ "campaign_id": campaign_id }),
                )
                .await?;
                if rows.is_empty() {
                    Err(Error::Server)
                } else {
                    Ok(())
                }
            },
        );
    };

    rsx! {
        section { aria_labelledby: "roster",
            h2 { id: "roster", class: "section", "Party" }
            if data.characters.is_empty() {
                p { class: "muted", "No characters in this campaign yet." }
            } else {
                div { class: "scroll",
                    table { class: "data",
                        thead { tr {
                            th { scope: "col", "Traveller" }
                            th { scope: "col", "Player" }
                            th { scope: "col", Tip { text: glossary::UPP, "UPP" } }
                            th { scope: "col", Tip { text: glossary::CONDITION, "Condition" } }
                            th { scope: "col", span { class: "sr-only", "Actions" } }
                        } }
                        tbody {
                            for row in data.characters.iter() {
                                {
                                    let (state, bad) = condition(row);
                                    let mine = row.owner_id.as_deref() == Some(data.me.as_str());
                                    let id = row.id.clone();
                                    rsx! {
                                        tr { key: "{row.id}",
                                            td { Link { class: "strong", to: Route::Character { id: row.id.clone() }, "{row.display_name()}" } }
                                            td { class: "muted", {row.owner_id.as_deref().map(|o| data.name_of(o)).unwrap_or_default()} }
                                            td { class: "upp", {row.characteristics.unwrap_or_default().upp()} }
                                            td { class: if bad { "strong neg" } else { "pos" }, "{state}" }
                                            td {
                                                if mine {
                                                    button { class: "mini outline", r#type: "button", disabled: busy,
                                                        onclick: move |_| {
                                                            let id = id.clone();
                                                            actions.run("Character removed from the campaign.", move |current| async move {
                                                                let rows: Vec<serde_json::Value> = supabase::patch(
                                                                    &current,
                                                                    &format!("characters?id=eq.{id}&select=id"),
                                                                    &serde_json::json!({ "campaign_id": null }),
                                                                ).await?;
                                                                if rows.is_empty() { Err(Error::Server) } else { Ok(()) }
                                                            });
                                                        },
                                                        "Leave party"
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
        }
        if is_member && !data.unassigned.is_empty() {
            form { class: "edit-form", onsubmit: add,
                h3 { "Bring a character" }
                div { class: "inline wrap",
                    label { class: "sr-only", r#for: "bring", "Your character" }
                    select { id: "bring", onchange: move |e| chosen.set(e.value()),
                        option { value: "", "Choose one of your characters…" }
                        for c in data.unassigned.iter() {
                            option { key: "{c.id}", value: "{c.id}", "{c.display_name()}" }
                        }
                    }
                    button { class: "btn", r#type: "submit", disabled: busy || chosen().is_empty(), "Add to party" }
                }
            }
        }
    }
}

// ---------------------------------------------------------------------------
// Members

#[component]
fn Members(data: CampaignData, actions: Actions) -> Element {
    let is_admin = data.is_admin();
    let can_invite = is_admin || data.is_referee();
    rsx! {
        section { aria_labelledby: "members",
            h2 { id: "members", class: "section", "Members" }
            p { class: "muted small role-key",
                "Roles: "
                Tip { text: glossary::REFEREE, "Referee" }
                " · "
                Tip { text: glossary::PLAYER, "Player" }
                " · "
                Tip { text: glossary::ADMIN, "Admin" }
            }
            ul { class: "edit-list",
                for member in data.members.iter() {
                    MemberItem { key: "{member.id}", member: member.clone(), data: data.clone(), actions }
                }
            }
        }
        if can_invite {
            Invite { data: data.clone(), actions }
        }
        if is_admin && !data.invitations.is_empty() {
            section { aria_labelledby: "pending",
                h2 { id: "pending", class: "section", "Pending invitations" }
                ul { class: "edit-list",
                    for inv in data.invitations.iter() {
                        {
                            let id = inv.id.clone();
                            rsx! {
                                li { key: "{inv.id}",
                                    span { class: "edit-summary",
                                        strong { "{inv.invited_email}" }
                                        span { class: "muted", " · {inv.roles_offered.label()} · expires {date(&inv.expires_at)}" }
                                    }
                                    button { class: "mini outline", r#type: "button", disabled: (actions.busy)(),
                                        onclick: move |_| {
                                            let id = id.clone();
                                            actions.run("Invitation cancelled.", move |current| async move {
                                                supabase::delete(&current, &format!("campaign_invitations?id=eq.{id}")).await.map(|_| ())
                                            });
                                        },
                                        "Cancel invitation"
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
        if data.is_creator() {
            Settings { data: data.clone(), actions }
        }
    }
}

#[component]
fn MemberItem(member: MemberRow, data: CampaignData, actions: Actions) -> Element {
    let mut admin = use_signal(|| member.is_admin);
    let mut referee = use_signal(|| member.is_gm);
    let mut player = use_signal(|| member.is_player);
    let mut confirm = use_signal(|| false);
    let busy = (actions.busy)();

    let creator = data.campaign.created_by.clone();
    let is_creator_row = member.user_id == creator;
    let is_me = member.user_id == data.me;
    // The database only lets the creator change the creator's own row.
    let can_edit = data.is_admin() && (!is_creator_row || data.is_creator());
    let can_remove = data.is_admin() && !is_creator_row && !is_me;
    let can_leave = is_me && !is_creator_row;
    let changed =
        admin() != member.is_admin || referee() != member.is_gm || player() != member.is_player;
    let name = data.name_of(&member.user_id);
    let row_id = member.id.clone();

    let save = {
        let row_id = row_id.clone();
        move |_| {
            let (a, g, p) = (admin(), referee(), player());
            let row_id = row_id.clone();
            actions.run("Roles updated.", move |current| async move {
                let rows: Vec<serde_json::Value> = supabase::patch(
                    &current,
                    &format!("campaign_members?id=eq.{row_id}&select=id"),
                    &serde_json::json!({ "is_admin": a, "is_gm": g, "is_player": p }),
                )
                .await?;
                if rows.is_empty() {
                    Err(Error::Server)
                } else {
                    Ok(())
                }
            });
        }
    };
    let remove = {
        let row_id = row_id.clone();
        move |_| {
            let row_id = row_id.clone();
            actions.run(
                if is_me {
                    "You've left the campaign."
                } else {
                    "Member removed."
                },
                move |current| async move {
                    let n = supabase::delete(&current, &format!("campaign_members?id=eq.{row_id}"))
                        .await?;
                    if n == 0 { Err(Error::Server) } else { Ok(()) }
                },
            );
        }
    };

    rsx! {
        li {
            span { class: "edit-summary",
                strong { "{name}" }
                if is_me { span { class: "muted", " (you)" } }
                if is_creator_row { span { class: "muted", " · created the campaign" } }
                br {}
                span { class: "muted small", "{member.roles_label()}" }
            }
            if can_edit {
                span { class: "inline wrap roles",
                    label { class: "check small-check",
                        input { r#type: "checkbox", checked: referee(), onchange: move |e| referee.set(e.checked()) }
                        "Referee"
                    }
                    label { class: "check small-check",
                        input { r#type: "checkbox", checked: player(), onchange: move |e| player.set(e.checked()) }
                        "Player"
                    }
                    label { class: "check small-check",
                        input { r#type: "checkbox", checked: admin(), onchange: move |e| admin.set(e.checked()) }
                        "Admin"
                    }
                    if changed {
                        button { class: "mini", r#type: "button", disabled: busy, onclick: save, "Save roles" }
                    }
                }
            }
            if can_remove || can_leave {
                span { class: "row-actions",
                    if confirm() {
                        button { class: "mini", r#type: "button", disabled: busy, onclick: remove,
                            if is_me { "Confirm leave" } else { "Confirm remove" } }
                        button { class: "mini outline", r#type: "button", onclick: move |_| confirm.set(false), "Keep" }
                    } else {
                        button { class: "mini outline", r#type: "button", disabled: busy, onclick: move |_| confirm.set(true),
                            if is_me { "Leave campaign" } else { "Remove" } }
                    }
                }
            }
        }
    }
}

#[component]
fn Invite(data: CampaignData, actions: Actions) -> Element {
    let this_campaign = data.campaign.id.clone();
    let mut email = use_signal(String::new);
    let mut role = use_signal(|| "player".to_string());
    let busy = (actions.busy)();
    // Admins can offer any role; a referee who isn't an admin, players only
    // (the invite-user function enforces the same).
    let any_role = data.is_admin();

    let send = move |evt: FormEvent| {
        evt.prevent_default();
        let address = email().trim().to_lowercase();
        if !address.contains('@') || address.len() > 254 {
            let mut m = actions.message;
            m.set(Some((
                "Enter the email address they sign in with.".into(),
                true,
            )));
            return;
        }
        let campaign_id = this_campaign.clone();
        let chosen = if any_role { role() } else { "player".into() };
        email.set(String::new());
        actions.run(
            "Invitation sent. They'll see it on their Home page when they sign in with that email.",
            move |current| async move {
                supabase::invoke(
                    &current,
                    "invite-user",
                    &serde_json::json!({ "email": address, "campaignId": campaign_id, "role": chosen }),
                )
                .await
                .map(|_| ())
            },
        );
    };

    rsx! {
        form { class: "edit-form", onsubmit: send,
            h3 { "Invite someone" }
            div { class: "inline wrap",
                label { class: "sr-only", r#for: "invite-email", "Email" }
                input { id: "invite-email", r#type: "email", placeholder: "Their email", required: true,
                    autocomplete: "off", value: "{email}", oninput: move |e| email.set(e.value()) }
                if any_role {
                    label { class: "sr-only", r#for: "invite-role", "Role" }
                    select { id: "invite-role", onchange: move |e| role.set(e.value()),
                        option { value: "player", selected: role() == "player", "As a player" }
                        option { value: "gm", selected: role() == "gm", "As a referee" }
                        option { value: "admin", selected: role() == "admin", "As an admin" }
                    }
                }
                button { class: "btn", r#type: "submit", disabled: busy, "Send invitation" }
            }
        }
    }
}

#[component]
fn Settings(data: CampaignData, actions: Actions) -> Element {
    let navigator = use_navigator();
    let mut name = use_signal(|| data.campaign.name.clone());
    let mut description = use_signal(|| data.campaign.description.clone().unwrap_or_default());
    let mut typed = use_signal(String::new);
    let busy = (actions.busy)();
    let id = data.campaign.id.clone();
    let campaign_name = data.campaign.name.clone();
    let can_delete = typed().trim() == campaign_name.trim();

    let rename = {
        let id = id.clone();
        move |evt: FormEvent| {
            evt.prevent_default();
            let n = name().trim().to_string();
            let d = description().trim().to_string();
            if n.is_empty() || n.chars().count() > 120 || d.chars().count() > 1000 {
                let mut m = actions.message;
                m.set(Some((
                    "A name (up to 120 characters) is required; descriptions are up to 1000."
                        .into(),
                    true,
                )));
                return;
            }
            let id = id.clone();
            actions.run("Campaign updated.", move |current| async move {
                let rows: Vec<serde_json::Value> = supabase::patch(
                    &current,
                    &format!("campaigns?id=eq.{id}&select=id"),
                    &serde_json::json!({ "name": n, "description": if d.is_empty() { None } else { Some(d) } }),
                )
                .await?;
                if rows.is_empty() { Err(Error::Server) } else { Ok(()) }
            });
        }
    };

    let delete = move |evt: FormEvent| {
        evt.prevent_default();
        if !can_delete {
            return;
        }
        let id = id.clone();
        let mut busy_signal = actions.busy;
        let mut message = actions.message;
        busy_signal.set(true);
        spawn(async move {
            let result = async {
                let current = fresh_session(actions.session).await?;
                supabase::delete(&current, &format!("campaigns?id=eq.{id}")).await
            }
            .await;
            busy_signal.set(false);
            match result {
                Ok(n) if n > 0 => {
                    navigator.push(Route::Campaigns {});
                }
                Ok(_) => message.set(Some((
                    "Only the campaign's creator can delete it.".into(),
                    true,
                ))),
                Err(e) => message.set(Some((e.to_string(), true))),
            }
        });
    };

    rsx! {
        section { class: "edit-section", aria_labelledby: "settings",
            h2 { id: "settings", class: "section", "Campaign settings" }
            form { class: "edit-form", onsubmit: rename,
                div { class: "field wide",
                    label { r#for: "set-name", "Name" }
                    input { id: "set-name", r#type: "text", maxlength: "120", value: "{name}", oninput: move |e| name.set(e.value()) }
                }
                div { class: "field wide",
                    label { r#for: "set-about", "Description" }
                    textarea { id: "set-about", rows: "2", maxlength: "1000", value: "{description}", oninput: move |e| description.set(e.value()) }
                }
                button { class: "btn", r#type: "submit", disabled: busy, "Save settings" }
            }
        }
        section { class: "edit-section danger", aria_labelledby: "delete-campaign",
            h2 { id: "delete-campaign", class: "section", "Delete campaign" }
            p { "This removes the campaign and its member list. Characters stay with their players, unassigned." }
            form { class: "edit-form", onsubmit: delete,
                div { class: "field wide",
                    label { r#for: "confirm-campaign", "Type the campaign's name to confirm" }
                    input { id: "confirm-campaign", r#type: "text", autocomplete: "off", value: "{typed}", oninput: move |e| typed.set(e.value()) }
                }
                button { class: "btn", r#type: "submit", disabled: !can_delete || busy, "Delete campaign" }
            }
        }
    }
}

/// "2026-11-25T00:00:00+00:00" → "2026-11-25".
fn date(timestamp: &str) -> &str {
    timestamp.get(..10).unwrap_or(timestamp)
}

#[cfg(test)]
mod tests {
    use super::*;
    use traveller_model::Characteristics;

    #[test]
    fn dates_shorten() {
        assert_eq!(date("2026-11-25T00:00:00+00:00"), "2026-11-25");
        assert_eq!(date("soon"), "soon");
    }

    #[test]
    fn condition_reports_damage() {
        let mut c = Characteristics::default();
        c.str.value = 7;
        c.dex.value = 7;
        c.end.value = 8;
        let mut row = CharacterRow {
            id: "x".into(),
            owner_id: None,
            name: "n".into(),
            character_name: None,
            player_name: None,
            campaign_id: None,
            characteristics: Some(c),
        };
        assert_eq!(condition(&row), ("Fit".to_string(), false));
        c.end.current = Some(6);
        row.characteristics = Some(c);
        assert_eq!(condition(&row), ("END 6 of 8".to_string(), true));
        c.str.current = Some(0);
        row.characteristics = Some(c);
        assert_eq!(condition(&row).0, "Unconscious");
    }
}
