//! Small tooltips explaining Traveller terms.
//!
//! The term is a button, so it works by hover, keyboard focus and tap.
//! The explanation is linked with `aria-describedby` for screen readers,
//! stays open while the pointer is over it, and Escape dismisses it
//! (WCAG 1.4.13).

use std::sync::atomic::{AtomicUsize, Ordering};

use dioxus::prelude::*;
use traveller_rules::Characteristic;

static NEXT_ID: AtomicUsize = AtomicUsize::new(0);

/// A term with an explanation on hover, focus or tap.
#[component]
pub fn Tip(text: &'static str, children: Element) -> Element {
    let id = use_hook(|| format!("tip-{}", NEXT_ID.fetch_add(1, Ordering::Relaxed)));
    let mut dismissed = use_signal(|| false);
    rsx! {
        span { class: "tip", onmouseleave: move |_| dismissed.set(false),
            button {
                class: "tip-term",
                r#type: "button",
                aria_describedby: "{id}",
                onkeydown: move |e| {
                    if e.key() == Key::Escape {
                        dismissed.set(true);
                    }
                },
                onfocusout: move |_| dismissed.set(false),
                {children}
            }
            span { id: "{id}", role: "tooltip", class: if dismissed() { "tip-text dismissed" } else { "tip-text" },
                "{text}"
            }
        }
    }
}

/// Explanations, in our own words, of the terms the app shows.
pub mod glossary {
    use super::Characteristic;

    pub const UPP: &str = "Universal Personality Profile: the six characteristics in order \
        (STR DEX END INT EDU SOC), one digit each, with letters from 10 up (A = 10, B = 11). \
        Shows current values, so damage changes it.";
    pub const DM: &str = "Dice modifier: added to a 2D roll. Comes from characteristic scores \
        and skill levels.";
    pub const LEVEL: &str = "Skill level. 0 means trained but no bonus; each level above adds +1. \
        Without the skill at all, checks take DM \u{2212}3.";
    pub const TL: &str =
        "Tech Level: how advanced the technology is. Higher is more sophisticated.";
    pub const RANGE: &str = "Effective range in metres, or Melee for close combat.";
    pub const DAMAGE: &str = "Dice rolled when an attack hits, e.g. 3D-3 is three dice minus 3. \
        The attack's Effect is added; armour Protection is subtracted.";
    pub const ROUNDS: &str = "Rounds left in the loaded magazine, out of its capacity.";
    pub const SPARE_MAGS: &str = "Full spare magazines carried. Reloading uses one.";
    pub const TRAITS: &str = "Special rules for the weapon, such as AP (armour piercing) or Auto.";
    pub const PROTECTION: &str = "Subtracted from the damage of each hit.";
    pub const RAD: &str = "Radiation protection: rads the armour stops.";
    pub const KG: &str = "Mass in kilograms; adds to what the character carries.";
    pub const RADS: &str = "Radiation absorbed over a lifetime. It builds up and never goes away.";
    pub const PENSION: &str = "Paid each year after leaving a career with enough terms served.";
    pub const LIVING_COST: &str = "What the character's lifestyle costs each month.";
    pub const DEBTS: &str = "Money owed, such as medical bills or loans.";
    pub const CONDITION: &str = "Fit, or which of STR, DEX and END are reduced by damage. \
        STR or DEX at 0 means unconscious; all three at 0, dead.";
    pub const REFEREE: &str = "Runs the game (the GM). Can read players' sheets but not edit them.";
    pub const PLAYER: &str = "Plays a character in the campaign and manages its sheet.";
    pub const ADMIN: &str = "Manages the campaign's members, roles and invitations.";

    /// What each characteristic covers.
    pub fn characteristic(c: Characteristic) -> &'static str {
        match c {
            Characteristic::Str => "Strength: physical power. Takes damage once END is gone.",
            Characteristic::Dex => {
                "Dexterity: agility and coordination. Takes damage once END is gone."
            }
            Characteristic::End => "Endurance: stamina. Damage comes off END first.",
            Characteristic::Int => "Intellect: reasoning and quick thinking.",
            Characteristic::Edu => "Education: learning and training.",
            Characteristic::Soc => "Social Standing: rank and influence in society.",
        }
    }
}
