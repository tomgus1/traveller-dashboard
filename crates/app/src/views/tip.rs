//! Small tooltips explaining Traveller terms.
//!
//! The term is a button, so it works by hover, keyboard focus and tap.
//! The explanation is linked with `aria-describedby` for screen readers,
//! stays open while the pointer is over it, and Escape dismisses it
//! (WCAG 1.4.13).
//!
//! The explanation is positioned against the window (`position: fixed`),
//! not the term's box, so scrolling tables can't clip it. It opens below
//! the term, or above when there isn't room, and stays inside the window.

use std::rc::Rc;
use std::sync::atomic::{AtomicUsize, Ordering};

use dioxus::prelude::*;
use js_sys::wasm_bindgen::JsValue;
use traveller_rules::Characteristic;

static NEXT_ID: AtomicUsize = AtomicUsize::new(0);

/// Widest a tooltip gets, in CSS pixels (matches `.tip-text`).
const MAX_WIDTH: f64 = 280.0;
/// Room assumed for a tooltip's height when deciding to open upwards.
const ROOM: f64 = 140.0;
/// Gap between term and tooltip, and from the window's edges.
const GAP: f64 = 6.0;
const MARGIN: f64 = 8.0;

/// Where to draw a tooltip for a term at `(x, top, bottom)` in a window of
/// `(width, height)`: left edge, top edge, and whether it opens upwards
/// (then `top` is its bottom edge).
pub fn place(x: f64, top: f64, bottom: f64, window: (f64, f64)) -> (f64, f64, bool) {
    let (width, height) = window;
    let tip_width = MAX_WIDTH.min(width - 2.0 * MARGIN);
    let left = x.min(width - tip_width - MARGIN).max(MARGIN);
    let above = bottom + GAP + ROOM > height && top - GAP - ROOM > 0.0;
    if above {
        (left, top - GAP, true)
    } else {
        (left, bottom + GAP, false)
    }
}

fn window_size() -> (f64, f64) {
    let size = |v: Result<JsValue, JsValue>| v.ok().and_then(|v| v.as_f64());
    web_sys::window()
        .and_then(|w| Some((size(w.inner_width())?, size(w.inner_height())?)))
        .unwrap_or((1280.0, 800.0))
}

/// A term with an explanation on hover, focus or tap.
#[component]
pub fn Tip(text: &'static str, children: Element) -> Element {
    let id = use_hook(|| format!("tip-{}", NEXT_ID.fetch_add(1, Ordering::Relaxed)));
    let mut term = use_signal(|| None::<Rc<MountedData>>);
    // Fixed position while open; None when closed.
    let mut open = use_signal(|| None::<(f64, f64, bool)>);

    let show = move || {
        spawn(async move {
            let Some(element) = term() else { return };
            if let Ok(rect) = element.get_client_rect().await {
                open.set(Some(place(
                    rect.min_x(),
                    rect.min_y(),
                    rect.max_y(),
                    window_size(),
                )));
            }
        });
    };

    let style = match open() {
        Some((left, top, true)) => {
            format!("left: {left}px; top: {top}px; transform: translateY(-100%);")
        }
        Some((left, top, false)) => format!("left: {left}px; top: {top}px;"),
        None => String::new(),
    };

    rsx! {
        span { class: "tip",
            onmouseenter: move |_| show(),
            onmouseleave: move |_| open.set(None),
            button {
                class: "tip-term",
                r#type: "button",
                aria_describedby: "{id}",
                onmounted: move |e| term.set(Some(e.data())),
                onfocus: move |_| show(),
                onblur: move |_| open.set(None),
                onkeydown: move |e| {
                    if e.key() == Key::Escape {
                        open.set(None);
                    }
                },
                {children}
            }
            span { id: "{id}", role: "tooltip",
                class: if open().is_some() { "tip-text open" } else { "tip-text" },
                style: "{style}",
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
        Any level in one speciality gives the skill's other specialities at 0. \
        Without the skill at all, checks take DM \u{2212}3.";
    pub const AUGMENT_BONUS: &str = "Added by augments, on top of the Traveller's own value. \
        Removing the augment removes it.";
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
    pub const UWP: &str = "Universal World Profile: a world in one code, e.g. B867A69-C: \
        starport, size, atmosphere, hydrographics, population, government, law level, then \
        tech level.";
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

#[cfg(test)]
mod tests {
    use super::place;

    #[test]
    fn opens_below_and_stays_inside_the_window() {
        // Plenty of room: just below the term, at its left edge.
        assert_eq!(
            place(100.0, 50.0, 70.0, (1280.0, 800.0)),
            (100.0, 76.0, false)
        );
        // Near the right edge: pulled left so 280px fits.
        let (left, _, _) = place(1200.0, 50.0, 70.0, (1280.0, 800.0));
        assert!((left - (1280.0 - 280.0 - 8.0)).abs() < f64::EPSILON);
        // Near the left edge: kept off it.
        assert_eq!(place(-20.0, 50.0, 70.0, (1280.0, 800.0)).0, 8.0);
    }

    #[test]
    fn opens_above_near_the_bottom() {
        assert_eq!(
            place(100.0, 700.0, 720.0, (1280.0, 800.0)),
            (100.0, 694.0, true)
        );
        // No room above either: stay below.
        assert!(!place(100.0, 60.0, 80.0, (1280.0, 150.0)).2);
    }

    #[test]
    fn narrow_phone_screens() {
        // 375px wide: a 280px tooltip near the right fits, ending 8px in.
        let left = place(300.0, 50.0, 70.0, (375.0, 700.0)).0;
        assert!((left - 87.0).abs() < f64::EPSILON);
        assert!(left + 280.0 <= 375.0 - 8.0);
        // 250px wide: the tooltip narrows to fit and sits at the margin.
        assert!((place(200.0, 50.0, 70.0, (250.0, 700.0)).0 - 8.0).abs() < f64::EPSILON);
    }
}
