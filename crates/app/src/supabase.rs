//! A small Supabase client: Auth (sign in, refresh, sign out) and REST
//! (`PostgREST`) reads. There's no official Rust client, and these endpoints
//! are plain HTTP.

use std::fmt::Write as _;

use serde::Deserialize;
use serde::de::DeserializeOwned;
use thiserror::Error;

use crate::config;
use crate::session::{self, Session};

/// Errors shown to users. Messages are deliberately general: database
/// errors name tables and policies, which users shouldn't see.
#[derive(Debug, Error)]
pub enum Error {
    /// The build has no Supabase settings.
    #[error("The app isn't configured to reach its server.")]
    NotConfigured,
    /// Wrong email or password.
    #[error("Incorrect email or password.")]
    InvalidCredentials,
    /// The session can't be refreshed; the user must sign in again.
    #[error("Your session has ended. Please sign in again.")]
    SessionExpired,
    /// Network failure.
    #[error("Couldn't reach the server. Check your connection.")]
    Network,
    /// The server doesn't have this yet (e.g. a migration isn't applied).
    #[error("This part of the app isn't set up on the server yet.")]
    Unavailable,
    /// A message written for users by our own server code (the invite-user
    /// function), shown as it is.
    #[error("{0}")]
    Rejected(String),
    /// Anything else the server reported.
    #[error("Something went wrong. Please try again.")]
    Server,
}

impl From<reqwest::Error> for Error {
    fn from(err: reqwest::Error) -> Self {
        if err.is_decode() || err.is_status() {
            Self::Server
        } else {
            Self::Network
        }
    }
}

#[derive(Deserialize)]
struct TokenResponse {
    access_token: String,
    refresh_token: String,
    expires_at: Option<i64>,
    expires_in: i64,
    user: TokenUser,
}

#[derive(Deserialize)]
struct TokenUser {
    id: String,
    email: Option<String>,
}

impl From<TokenResponse> for Session {
    fn from(t: TokenResponse) -> Self {
        Session {
            access_token: t.access_token,
            refresh_token: t.refresh_token,
            expires_at: t
                .expires_at
                .unwrap_or_else(|| session::now_secs() + t.expires_in),
            user_id: t.user.id,
            email: t.user.email.unwrap_or_default(),
        }
    }
}

fn settings() -> Result<(&'static str, &'static str), Error> {
    config::supabase().ok_or(Error::NotConfigured)
}

async fn token(grant: &str, body: serde_json::Value) -> Result<Session, Error> {
    let (url, key) = settings()?;
    let response = reqwest::Client::new()
        .post(format!("{url}/auth/v1/token?grant_type={grant}"))
        .header("apikey", key)
        .json(&body)
        .send()
        .await?;
    match response.status().as_u16() {
        200 => Ok(response.json::<TokenResponse>().await?.into()),
        400 if grant == "password" => Err(Error::InvalidCredentials),
        400 | 401 => Err(Error::SessionExpired),
        _ => Err(Error::Server),
    }
}

/// Signs in with email and password.
pub async fn sign_in(email: &str, password: &str) -> Result<Session, Error> {
    token(
        "password",
        serde_json::json!({ "email": email.trim(), "password": password }),
    )
    .await
}

/// Exchanges a refresh token for a new session.
pub async fn refresh(current: &Session) -> Result<Session, Error> {
    token(
        "refresh_token",
        serde_json::json!({ "refresh_token": current.refresh_token }),
    )
    .await
}

/// Revokes the session on the server. Failure is ignored: the local
/// session is cleared either way.
pub async fn sign_out(current: &Session) {
    if let Ok((url, key)) = settings() {
        let _ = reqwest::Client::new()
            .post(format!("{url}/auth/v1/logout"))
            .header("apikey", key)
            .bearer_auth(&current.access_token)
            .send()
            .await;
    }
}

/// A fresh session: refreshes the token if it expires within a minute.
pub async fn ensure_fresh(current: &Session) -> Result<Session, Error> {
    if current.expires_within(60) {
        refresh(current).await
    } else {
        Ok(current.clone())
    }
}

/// GET from the REST API as the signed-in user, e.g.
/// `get("characters?select=*&order=name")`. Row Level Security decides what
/// comes back.
pub async fn get<T: DeserializeOwned>(current: &Session, path: &str) -> Result<T, Error> {
    let (url, key) = settings()?;
    let response = reqwest::Client::new()
        .get(format!("{url}/rest/v1/{path}"))
        .header("apikey", key)
        .bearer_auth(&current.access_token)
        .send()
        .await?;
    match response.status().as_u16() {
        200 => Ok(response.json().await?),
        401 => Err(Error::SessionExpired),
        404 => Err(Error::Unavailable),
        _ => Err(Error::Server),
    }
}

/// PATCH rows matching `path`'s filters with `body`, returning the updated
/// rows. Row Level Security limits which rows can change; an empty result
/// means nothing matched (no permission, or a version filter didn't match).
pub async fn patch<T: DeserializeOwned>(
    current: &Session,
    path: &str,
    body: &serde_json::Value,
) -> Result<Vec<T>, Error> {
    let (url, key) = settings()?;
    let response = reqwest::Client::new()
        .patch(format!("{url}/rest/v1/{path}"))
        .header("apikey", key)
        .header("Prefer", "return=representation")
        .bearer_auth(&current.access_token)
        .json(body)
        .send()
        .await?;
    match response.status().as_u16() {
        200 => Ok(response.json().await?),
        401 => Err(Error::SessionExpired),
        404 => Err(Error::Unavailable),
        _ => Err(Error::Server),
    }
}

/// INSERT `body` into `table`, returning the new rows (with defaults such as
/// generated ids filled in).
pub async fn post<T: DeserializeOwned>(
    current: &Session,
    table: &str,
    body: &serde_json::Value,
) -> Result<Vec<T>, Error> {
    let (url, key) = settings()?;
    let response = reqwest::Client::new()
        .post(format!("{url}/rest/v1/{table}"))
        .header("apikey", key)
        .header("Prefer", "return=representation")
        .bearer_auth(&current.access_token)
        .json(body)
        .send()
        .await?;
    match response.status().as_u16() {
        200 | 201 => Ok(response.json().await?),
        401 => Err(Error::SessionExpired),
        404 => Err(Error::Unavailable),
        _ => Err(Error::Server),
    }
}

/// DELETE rows matching `path`'s filters, returning how many went.
pub async fn delete(current: &Session, path: &str) -> Result<usize, Error> {
    let (url, key) = settings()?;
    let response = reqwest::Client::new()
        .delete(format!("{url}/rest/v1/{path}"))
        .header("apikey", key)
        .header("Prefer", "return=representation")
        .bearer_auth(&current.access_token)
        .send()
        .await?;
    match response.status().as_u16() {
        200 => Ok(response.json::<Vec<serde_json::Value>>().await?.len()),
        401 => Err(Error::SessionExpired),
        404 => Err(Error::Unavailable),
        _ => Err(Error::Server),
    }
}

/// Calls a database function (`/rest/v1/rpc/<name>`).
pub async fn rpc<T: DeserializeOwned>(
    current: &Session,
    name: &str,
    args: &serde_json::Value,
) -> Result<T, Error> {
    let (url, key) = settings()?;
    let response = reqwest::Client::new()
        .post(format!("{url}/rest/v1/rpc/{name}"))
        .header("apikey", key)
        .bearer_auth(&current.access_token)
        .json(args)
        .send()
        .await?;
    match response.status().as_u16() {
        200 => Ok(response.json().await?),
        401 => Err(Error::SessionExpired),
        404 => Err(Error::Unavailable),
        _ => Err(Error::Server),
    }
}

#[derive(Deserialize)]
struct FunctionError {
    error: Option<String>,
}

/// Calls one of our Edge Functions. Its `{"error": …}` messages are written
/// for users and come back as [`Error::Rejected`].
pub async fn invoke(
    current: &Session,
    function: &str,
    body: &serde_json::Value,
) -> Result<serde_json::Value, Error> {
    let (url, key) = settings()?;
    let response = reqwest::Client::new()
        .post(format!("{url}/functions/v1/{function}"))
        .header("apikey", key)
        .bearer_auth(&current.access_token)
        .json(body)
        .send()
        .await?;
    let status = response.status().as_u16();
    if status == 200 {
        return Ok(response.json().await?);
    }
    if status == 404 {
        return Err(Error::Unavailable);
    }
    let message = response
        .json::<FunctionError>()
        .await
        .ok()
        .and_then(|e| e.error)
        .filter(|m| !m.is_empty() && m.len() < 300);
    Err(message.map_or(Error::Server, Error::Rejected))
}

/// Percent-encodes a value for a query string (RFC 3986 unreserved
/// characters pass through). Timestamps contain `+` and `:`, which would
/// otherwise be misread.
pub fn encode(value: &str) -> String {
    let mut out = String::with_capacity(value.len());
    for byte in value.bytes() {
        if byte.is_ascii_alphanumeric() || b"-_.~".contains(&byte) {
            out.push(char::from(byte));
        } else {
            let _ = write!(out, "%{byte:02X}");
        }
    }
    out
}

#[cfg(test)]
mod tests {
    use super::encode;

    #[test]
    fn encodes_timestamps_for_filters() {
        assert_eq!(
            encode("2026-11-11T00:12:34.5+00:00"),
            "2026-11-11T00%3A12%3A34.5%2B00%3A00"
        );
        assert_eq!(encode("a b&c"), "a%20b%26c");
    }
}
