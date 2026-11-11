//! Campaigns, their members and invitations.

use serde::{Deserialize, Serialize};

/// A row of `campaigns`.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct CampaignRow {
    /// Primary key.
    pub id: String,
    /// Name.
    pub name: String,
    /// Optional description.
    #[serde(default)]
    pub description: Option<String>,
    /// The user who created it; they can rename or delete it.
    pub created_by: String,
}

impl CampaignRow {
    /// Columns to select; a test checks they match the fields.
    pub const COLUMNS: &'static str = "id,name,description,created_by";
}

/// A row of `campaign_members`. A member can hold several roles.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct MemberRow {
    /// Primary key.
    pub id: String,
    /// The campaign.
    pub campaign_id: String,
    /// The member.
    pub user_id: String,
    /// Manages members and invitations.
    #[serde(default)]
    pub is_admin: bool,
    /// The referee (game master).
    #[serde(default)]
    pub is_gm: bool,
    /// Plays a character.
    #[serde(default)]
    pub is_player: bool,
}

impl MemberRow {
    /// Columns to select; a test checks they match the fields.
    pub const COLUMNS: &'static str = "id,campaign_id,user_id,is_admin,is_gm,is_player";

    /// Roles in words, e.g. "Referee, Admin".
    pub fn roles_label(&self) -> String {
        let roles: Vec<&str> = [
            (self.is_gm, "Referee"),
            (self.is_player, "Player"),
            (self.is_admin, "Admin"),
        ]
        .into_iter()
        .filter_map(|(has, label)| has.then_some(label))
        .collect();
        if roles.is_empty() {
            "Member".into()
        } else {
            roles.join(", ")
        }
    }
}

/// A row of `user_profiles`, as campaign co-members can see it.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct ProfileRow {
    /// The user's id.
    pub id: String,
    /// Chosen display name.
    #[serde(default)]
    pub display_name: Option<String>,
    /// Chosen username.
    #[serde(default)]
    pub username: Option<String>,
}

impl ProfileRow {
    /// Columns to select; a test checks they match the fields.
    pub const COLUMNS: &'static str = "id,display_name,username";

    /// The best name to show.
    pub fn name(&self) -> &str {
        [self.display_name.as_deref(), self.username.as_deref()]
            .into_iter()
            .flatten()
            .find(|n| !n.trim().is_empty())
            .unwrap_or("A traveller")
    }
}

/// Roles offered by an invitation, as stored (`{"isAdmin": …}`).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
#[allow(missing_docs)]
pub struct RolesOffered {
    #[serde(default)]
    pub is_admin: bool,
    #[serde(default)]
    pub is_gm: bool,
    #[serde(default)]
    pub is_player: bool,
}

impl RolesOffered {
    /// In words, e.g. "player".
    pub fn label(self) -> &'static str {
        match (self.is_admin, self.is_gm) {
            (true, _) => "admin",
            (false, true) => "referee",
            _ => "player",
        }
    }
}

/// An invitation to the signed-in user, from `get_user_invitations()`.
#[derive(Debug, Clone, PartialEq, Eq, Deserialize)]
pub struct MyInvitation {
    /// Invitation id.
    pub id: String,
    /// Campaign invited to.
    pub campaign_id: String,
    /// Its name.
    pub campaign_name: String,
    /// Who sent it.
    #[serde(default)]
    pub inviter_name: Option<String>,
    /// Roles on joining.
    #[serde(default)]
    pub roles_offered: RolesOffered,
    /// When it lapses.
    pub expires_at: String,
}

/// A row of `campaign_invitations`, as an admin sees it.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct InvitationRow {
    /// Primary key.
    pub id: String,
    /// Who was invited.
    pub invited_email: String,
    /// Roles on joining.
    #[serde(default)]
    pub roles_offered: RolesOffered,
    /// pending, accepted, declined.
    pub status: String,
    /// When it lapses.
    pub expires_at: String,
}

impl InvitationRow {
    /// Columns to select; a test checks they match the fields.
    pub const COLUMNS: &'static str = "id,invited_email,roles_offered,status,expires_at";
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde::Serialize;

    fn assert_columns<T: Serialize>(row: &T, columns: &str) {
        let json = serde_json::to_value(row).unwrap();
        let mut fields: Vec<&str> = json
            .as_object()
            .unwrap()
            .keys()
            .map(String::as_str)
            .collect();
        let mut cols: Vec<&str> = columns.split(',').collect();
        fields.sort_unstable();
        cols.sort_unstable();
        assert_eq!(fields, cols);
    }

    #[test]
    fn columns_match_fields() {
        assert_columns(
            &CampaignRow {
                id: String::new(),
                name: String::new(),
                description: None,
                created_by: String::new(),
            },
            CampaignRow::COLUMNS,
        );
        assert_columns(
            &MemberRow {
                id: String::new(),
                campaign_id: String::new(),
                user_id: String::new(),
                is_admin: false,
                is_gm: false,
                is_player: false,
            },
            MemberRow::COLUMNS,
        );
        assert_columns(
            &ProfileRow {
                id: String::new(),
                display_name: None,
                username: None,
            },
            ProfileRow::COLUMNS,
        );
        assert_columns(
            &InvitationRow {
                id: String::new(),
                invited_email: String::new(),
                roles_offered: RolesOffered::default(),
                status: String::new(),
                expires_at: String::new(),
            },
            InvitationRow::COLUMNS,
        );
    }

    #[test]
    fn role_labels() {
        let mut m = MemberRow {
            id: String::new(),
            campaign_id: String::new(),
            user_id: String::new(),
            is_admin: true,
            is_gm: true,
            is_player: false,
        };
        assert_eq!(m.roles_label(), "Referee, Admin");
        m.is_admin = false;
        m.is_gm = false;
        assert_eq!(m.roles_label(), "Member");
    }

    #[test]
    fn reads_invitation_roles_as_stored() {
        let inv: InvitationRow = serde_json::from_value(serde_json::json!({
            "id": "i", "invited_email": "a@b.c", "status": "pending",
            "expires_at": "2026-11-25T00:00:00+00:00",
            "roles_offered": {"isAdmin": false, "isGm": true, "isPlayer": false}
        }))
        .unwrap();
        assert_eq!(inv.roles_offered.label(), "referee");
    }

    #[test]
    fn profile_name_falls_back() {
        let p = ProfileRow {
            id: String::new(),
            display_name: Some(" ".into()),
            username: Some("tom".into()),
        };
        assert_eq!(p.name(), "tom");
    }
}
