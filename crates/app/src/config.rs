//! Build-time configuration.
//!
//! The Supabase URL and anon key are public by design (Row Level Security
//! protects the data), so they are compiled into the app. Set them when
//! building: `SUPABASE_URL=… SUPABASE_ANON_KEY=… dx serve`.

/// Supabase project URL, e.g. `https://abcd.supabase.co`.
pub const SUPABASE_URL: Option<&str> = option_env!("SUPABASE_URL");

/// Supabase anon (public) key.
pub const SUPABASE_ANON_KEY: Option<&str> = option_env!("SUPABASE_ANON_KEY");

/// Both values, if the build had them.
pub fn supabase() -> Option<(&'static str, &'static str)> {
    match (SUPABASE_URL, SUPABASE_ANON_KEY) {
        (Some(url), Some(key)) if !url.is_empty() && !key.is_empty() => {
            Some((url.trim_end_matches('/'), key))
        }
        _ => None,
    }
}
