//! Rows as stored in the database.

use serde::Deserialize;
use traveller_rules::Characteristic;
use traveller_rules::characteristics::ehex;

/// A row of the `characters` table.
#[derive(Debug, Clone, PartialEq, Deserialize)]
pub struct CharacterRow {
    /// Primary key.
    pub id: String,
    /// Display name.
    pub name: String,
    /// In-game name, if different.
    pub character_name: Option<String>,
    /// Real player's name.
    pub player_name: Option<String>,
    /// Campaign it belongs to; none for an unassigned character.
    pub campaign_id: Option<String>,
    /// STR…SOC, stored as JSON.
    #[serde(default)]
    pub characteristics: Option<Characteristics>,
    /// Skills, stored as JSON.
    #[serde(default)]
    pub skills: Option<Vec<Skill>>,
}

impl CharacterRow {
    /// The name to show.
    pub fn display_name(&self) -> &str {
        self.character_name
            .as_deref()
            .filter(|n| !n.trim().is_empty())
            .unwrap_or(&self.name)
    }
}

/// One stored characteristic.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize, Default)]
pub struct Value {
    /// The score.
    pub value: i32,
}

/// The six characteristics as stored (`{"STR": {"value": 7}, …}`).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize, Default)]
#[serde(rename_all = "UPPERCASE")]
#[allow(missing_docs)]
pub struct Characteristics {
    #[serde(default)]
    pub str: Value,
    #[serde(default)]
    pub dex: Value,
    #[serde(default)]
    pub end: Value,
    #[serde(default)]
    pub int: Value,
    #[serde(default)]
    pub edu: Value,
    #[serde(default)]
    pub soc: Value,
}

impl Characteristics {
    /// A score by characteristic.
    pub fn get(&self, c: Characteristic) -> i32 {
        match c {
            Characteristic::Str => self.str.value,
            Characteristic::Dex => self.dex.value,
            Characteristic::End => self.end.value,
            Characteristic::Int => self.int.value,
            Characteristic::Edu => self.edu.value,
            Characteristic::Soc => self.soc.value,
        }
    }

    /// Universal Personality Profile, e.g. "7A8977".
    pub fn upp(&self) -> String {
        Characteristic::ALL
            .iter()
            .map(|&c| ehex(self.get(c)).unwrap_or('?'))
            .collect()
    }
}

/// One stored skill.
#[derive(Debug, Clone, PartialEq, Eq, Deserialize)]
pub struct Skill {
    /// Name with speciality, e.g. "Pilot (spacecraft)".
    pub name: String,
    /// Level; 0 means trained without bonus.
    pub level: i32,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn reads_stored_json_and_formats_upp() {
        let row: CharacterRow = serde_json::from_value(serde_json::json!({
            "id": "c1",
            "name": "Kiri",
            "character_name": "Kiri Tamsen",
            "player_name": null,
            "campaign_id": null,
            "characteristics": {
                "STR": {"value": 7, "xp": 0}, "DEX": {"value": 10, "xp": 0},
                "END": {"value": 8, "xp": 0}, "INT": {"value": 9, "xp": 0},
                "EDU": {"value": 7, "xp": 0}, "SOC": {"value": 7, "xp": 0}
            },
            "skills": [{"name": "Pilot (spacecraft)", "level": 2}]
        }))
        .unwrap();
        assert_eq!(row.display_name(), "Kiri Tamsen");
        assert_eq!(row.characteristics.unwrap().upp(), "7A8977");
        assert_eq!(row.skills.unwrap()[0].level, 2);
    }

    #[test]
    fn tolerates_missing_json() {
        let row: CharacterRow = serde_json::from_value(serde_json::json!({
            "id": "c2", "name": "Bram", "character_name": " ",
            "player_name": null, "campaign_id": null
        }))
        .unwrap();
        assert_eq!(row.display_name(), "Bram");
        assert!(row.characteristics.is_none());
    }
}
