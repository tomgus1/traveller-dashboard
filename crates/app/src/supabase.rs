//! A small Supabase client: Auth (sign in, refresh, sign out) and REST
//! (`PostgREST`) reads. There's no official Rust client, and these endpoints
//! are plain HTTP.

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
        _ => Err(Error::Server),
    }
}
