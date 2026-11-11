//! What Traveller Dashboard stores, as Rust types.
//!
//! - [`character::CharacterRow`]: the `characters` table, visible to the
//!   owner and their campaign (the roster).
//! - [`sheet::CharacterSheet`]: the `character_sheets` document, visible to
//!   the owner and their campaign's referee only.
//! - [`campaign_state::CampaignState`]: the `campaign_state` document, which
//!   every campaign member can read and edit.
//! - [`catalogue::CatalogueItem`]: the `catalogue_items` table, gear from
//!   the rulebooks for picking onto sheets.
//!
//! Every field has a default, so older or partial documents still load and
//! new fields can be added without migrating stored data.

pub mod campaign;
pub mod campaign_state;
pub mod catalogue;
pub mod character;
pub mod sheet;

pub use campaign::{CampaignRow, InvitationRow, MemberRow, MyInvitation, ProfileRow, RolesOffered};
pub use campaign_state::CampaignState;
pub use character::{CharacterRow, Characteristics, Stat};
pub use sheet::CharacterSheet;
