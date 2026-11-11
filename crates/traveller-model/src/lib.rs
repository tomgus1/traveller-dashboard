//! What Traveller Dashboard stores, as Rust types.
//!
//! - [`character::CharacterRow`]: the `characters` table, visible to the
//!   owner and their campaign (the roster).
//! - [`sheet::CharacterSheet`]: the `character_sheets` document, visible to
//!   the owner and their campaign's referee only.
//!
//! Every field has a default, so older or partial documents still load and
//! new fields can be added without migrating stored data.

pub mod campaign;
pub mod character;
pub mod sheet;

pub use campaign::{CampaignRow, InvitationRow, MemberRow, MyInvitation, ProfileRow, RolesOffered};
pub use character::{CharacterRow, Characteristics, Stat};
pub use sheet::CharacterSheet;
