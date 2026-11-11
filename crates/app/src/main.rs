//! Traveller Dashboard: the web app, in Rust compiled to WebAssembly.

mod config;
mod session;
mod supabase;
mod views;

use dioxus::prelude::*;
use views::{Campaign, Campaigns, Character, Characters, Home, NotFound, Shell};

const CSS: Asset = asset!("/assets/main.css");

/// Every page, under one layout.
#[derive(Routable, Clone, PartialEq)]
#[rustfmt::skip]
enum Route {
    #[layout(Shell)]
        #[route("/")]
        Home {},
        #[route("/characters")]
        Characters {},
        #[route("/characters/:id")]
        Character { id: String },
        #[route("/campaigns")]
        Campaigns {},
        #[route("/campaigns/:id")]
        Campaign { id: String },
    #[end_layout]
    #[route("/:..segments")]
    NotFound { segments: Vec<String> },
}

fn main() {
    dioxus::launch(App);
}

#[component]
fn App() -> Element {
    // The signed-in session, shared with every page.
    use_context_provider(|| Signal::new(session::load()));

    rsx! {
        document::Stylesheet { href: CSS }
        Router::<Route> {}
    }
}
