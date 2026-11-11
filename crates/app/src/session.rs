//! The signed-in user's session, kept in browser storage.
//!
//! Stored in `localStorage`, as supabase-js does, so a reload stays signed
//! in. Access tokens are short-lived and refreshed before they expire.

use gloo_storage::{LocalStorage, Storage};
use serde::{Deserialize, Serialize};

const KEY: &str = "traveller-dashboard.session";

/// A Supabase Auth session.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Session {
    /// Bearer token for API calls.
    pub access_token: String,
    /// Used to get a new access token.
    pub refresh_token: String,
    /// Unix time (seconds) the access token expires.
    pub expires_at: i64,
    /// The user's id.
    pub user_id: String,
    /// The user's email, for display.
    pub email: String,
}

impl Session {
    /// Whether the access token expires within `margin_secs`.
    pub fn expires_within(&self, margin_secs: i64) -> bool {
        self.expires_at - now_secs() <= margin_secs
    }
}

/// Seconds since the Unix epoch, from the browser clock.
#[allow(clippy::cast_possible_truncation)]
pub fn now_secs() -> i64 {
    (js_sys::Date::now() / 1000.0) as i64
}

/// The saved session, if any. Unreadable or blocked storage counts as none.
pub fn load() -> Option<Session> {
    LocalStorage::get(KEY).ok()
}

/// Saves the session (or clears it). Storage failures are ignored: the
/// session still works until the page is reloaded.
pub fn save(session: Option<&Session>) {
    match session {
        Some(s) => {
            let _ = LocalStorage::set(KEY, s);
        }
        None => LocalStorage::delete(KEY),
    }
}
