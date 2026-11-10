//! The `characters` table: identity and characteristics.

use serde::{Deserialize, Serialize};
use traveller_rules::Characteristic;
use traveller_rules::characteristics::{Condition, Physical, Score, ehex};

/// A row of `characters`.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct CharacterRow {
    /// Primary key.
    pub id: String,
    /// Owner's user id.
    #[serde(default)]
    pub owner_id: Option<String>,
    /// Display name.
    pub name: String,
    /// In-game name, if different.
    #[serde(default)]
    pub character_name: Option<String>,
    /// The real player's name.
    #[serde(default)]
    pub player_name: Option<String>,
    /// Campaign; none for an unassigned character.
    #[serde(default)]
    pub campaign_id: Option<String>,
    /// STR…SOC.
    #[serde(default)]
    pub characteristics: Option<Characteristics>,
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

/// One characteristic as stored: `{"value": 8, "current": 6, "xp": 0}`.
///
/// `value` is the unhurt maximum (the name the original app used, kept so
/// existing rows stay valid). `current` is only stored once damaged.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Default)]
pub struct Stat {
    /// Maximum.
    #[serde(default)]
    pub value: i32,
    /// After damage; `None` means unhurt.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub current: Option<i32>,
    /// Experience towards raising it.
    #[serde(default)]
    pub xp: i32,
}

impl Stat {
    /// The value in play: current if damaged, otherwise the maximum.
    pub fn current(self) -> i32 {
        self.current.unwrap_or(self.value)
    }

    /// Whether it's below its maximum.
    pub fn is_reduced(self) -> bool {
        self.current() < self.value
    }

    fn score(self) -> Score {
        Score {
            max: self.value,
            current: self.current(),
        }
    }

    fn set_score(&mut self, score: Score) {
        self.current = (score.current != self.value).then_some(score.current);
    }
}

/// The six characteristics as stored (`{"STR": {...}, …}`).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(rename_all = "UPPERCASE")]
#[allow(missing_docs)]
pub struct Characteristics {
    #[serde(default)]
    pub str: Stat,
    #[serde(default)]
    pub dex: Stat,
    #[serde(default)]
    pub end: Stat,
    #[serde(default)]
    pub int: Stat,
    #[serde(default)]
    pub edu: Stat,
    #[serde(default)]
    pub soc: Stat,
}

impl Characteristics {
    /// One characteristic.
    pub fn get(&self, c: Characteristic) -> Stat {
        match c {
            Characteristic::Str => self.str,
            Characteristic::Dex => self.dex,
            Characteristic::End => self.end,
            Characteristic::Int => self.int,
            Characteristic::Edu => self.edu,
            Characteristic::Soc => self.soc,
        }
    }

    /// Universal Personality Profile from current values, e.g. "7A8977".
    pub fn upp(&self) -> String {
        Characteristic::ALL
            .iter()
            .map(|&c| ehex(self.get(c).current()).unwrap_or('?'))
            .collect()
    }

    /// STR, DEX and END for the damage rules.
    pub fn physical(&self) -> Physical {
        Physical {
            str: self.str.score(),
            dex: self.dex.score(),
            end: self.end.score(),
        }
    }

    /// Stores the result of applying damage or healing.
    pub fn set_physical(&mut self, physical: Physical) {
        self.str.set_score(physical.str);
        self.dex.set_score(physical.dex);
        self.end.set_score(physical.end);
    }

    /// Conscious, unconscious or dead (Core p.77).
    pub fn condition(&self) -> Condition {
        self.physical().condition()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use traveller_rules::characteristics::Overflow;

    fn sample() -> Characteristics {
        serde_json::from_value(serde_json::json!({
            "STR": {"value": 7, "xp": 0}, "DEX": {"value": 10, "xp": 0},
            "END": {"value": 8, "xp": 0}, "INT": {"value": 9, "xp": 0},
            "EDU": {"value": 7, "xp": 0}, "SOC": {"value": 7, "xp": 0}
        }))
        .unwrap()
    }

    #[test]
    fn reads_existing_rows_as_unhurt() {
        let c = sample();
        assert_eq!(c.upp(), "7A8977");
        assert!(!c.end.is_reduced());
    }

    #[test]
    fn damage_round_trips_and_only_stores_current_when_reduced() {
        let mut c = sample();
        let mut physical = c.physical();
        physical.apply_damage(2, Overflow::Str);
        c.set_physical(physical);

        assert_eq!(c.end.current(), 6);
        assert!(c.end.is_reduced());
        assert_eq!(c.upp(), "7A6977", "UPP uses current values (END third)");

        let json = serde_json::to_value(c).unwrap();
        assert_eq!(
            json["END"],
            serde_json::json!({"value": 8, "current": 6, "xp": 0})
        );
        assert_eq!(json["STR"], serde_json::json!({"value": 7, "xp": 0}));
        assert_eq!(serde_json::from_value::<Characteristics>(json).unwrap(), c);
    }

    #[test]
    fn display_name_falls_back_to_name() {
        let row: CharacterRow = serde_json::from_value(serde_json::json!({
            "id": "c1", "name": "Bram", "character_name": "  "
        }))
        .unwrap();
        assert_eq!(row.display_name(), "Bram");
    }
}
