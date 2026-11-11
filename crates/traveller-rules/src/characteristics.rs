//! Characteristics, their dice modifiers, and physical damage.

use std::fmt;

/// The six characteristics, in UPP order.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum Characteristic {
    /// Strength.
    Str,
    /// Dexterity.
    Dex,
    /// Endurance.
    End,
    /// Intellect.
    Int,
    /// Education.
    Edu,
    /// Social Standing.
    Soc,
}

impl Characteristic {
    /// All six, in UPP order.
    pub const ALL: [Self; 6] = [
        Self::Str,
        Self::Dex,
        Self::End,
        Self::Int,
        Self::Edu,
        Self::Soc,
    ];

    /// Whether damage can reduce it (STR, DEX, END).
    pub fn is_physical(self) -> bool {
        matches!(self, Self::Str | Self::Dex | Self::End)
    }

    /// Three-letter abbreviation.
    pub fn abbreviation(self) -> &'static str {
        match self {
            Self::Str => "STR",
            Self::Dex => "DEX",
            Self::End => "END",
            Self::Int => "INT",
            Self::Edu => "EDU",
            Self::Soc => "SOC",
        }
    }
}

impl fmt::Display for Characteristic {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(self.abbreviation())
    }
}

/// Dice modifier for a characteristic score (Core p.9).
pub fn dm(score: i32) -> i32 {
    match score {
        i32::MIN..=0 => -3,
        1..=2 => -2,
        3..=5 => -1,
        6..=8 => 0,
        9..=11 => 1,
        12..=14 => 2,
        _ => 3,
    }
}

// Extended hex skips I and O so they can't be read as 1 and 0.
const EHEX: &[u8] = b"0123456789ABCDEFGHJKLMNPQRSTUVWXYZ";

/// One extended-hex digit, as used in a UPP: 10 → 'A', 18 → 'J'.
/// Returns `None` for values that can't be written.
pub fn ehex(value: i32) -> Option<char> {
    usize::try_from(value)
        .ok()
        .and_then(|i| EHEX.get(i))
        .map(|&b| char::from(b))
}

/// A physical characteristic's maximum and current (after damage) values.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Score {
    /// Unhurt value.
    pub max: i32,
    /// Value after damage; DMs use this until healed (Core p.77).
    pub current: i32,
}

impl Score {
    /// An unhurt score.
    pub fn new(max: i32) -> Self {
        Self { max, current: max }
    }

    /// Points of damage taken.
    pub fn damage(self) -> i32 {
        self.max - self.current
    }
}

/// Which of STR or DEX takes damage once END is gone; the target chooses
/// (Core p.77).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Overflow {
    /// Excess damage goes to STR first.
    Str,
    /// Excess damage goes to DEX first.
    Dex,
}

/// A Traveller's physical condition after damage (Core p.77).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Condition {
    /// On their feet.
    Conscious,
    /// STR or DEX has reached 0.
    Unconscious,
    /// STR, DEX and END have all reached 0.
    Dead,
}

/// STR, DEX and END: the characteristics damage is applied to.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Physical {
    /// Strength.
    pub str: Score,
    /// Dexterity.
    pub dex: Score,
    /// Endurance.
    pub end: Score,
}

impl Physical {
    /// Unhurt values.
    pub fn new(str: i32, dex: i32, end: i32) -> Self {
        Self {
            str: Score::new(str),
            dex: Score::new(dex),
            end: Score::new(end),
        }
    }

    /// Applies damage (after armour) as the rulebook describes (Core p.77):
    /// END first; any excess to STR or DEX, as chosen; once that reaches 0,
    /// to the remaining one.
    pub fn apply_damage(&mut self, amount: i32, overflow: Overflow) {
        let mut remaining = amount.max(0);
        for score in self.damage_order(overflow) {
            let taken = remaining.min(score.current);
            score.current -= taken;
            remaining -= taken;
        }
    }

    fn damage_order(&mut self, overflow: Overflow) -> [&mut Score; 3] {
        match overflow {
            Overflow::Str => [&mut self.end, &mut self.str, &mut self.dex],
            Overflow::Dex => [&mut self.end, &mut self.dex, &mut self.str],
        }
    }

    /// Conscious, unconscious or dead (Core p.77).
    pub fn condition(&self) -> Condition {
        let zero = |s: Score| s.current <= 0;
        if zero(self.str) && zero(self.dex) && zero(self.end) {
            Condition::Dead
        } else if zero(self.str) || zero(self.dex) {
            Condition::Unconscious
        } else {
            Condition::Conscious
        }
    }

    /// How many of the three are below their maximum.
    pub fn damaged_count(&self) -> usize {
        [self.str, self.dex, self.end]
            .iter()
            .filter(|s| s.current < s.max)
            .count()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn dm_matches_the_characteristic_modifiers_table() {
        // Core p.9
        let table = [
            (0, -3),
            (1, -2),
            (2, -2),
            (3, -1),
            (5, -1),
            (6, 0),
            (8, 0),
            (9, 1),
            (11, 1),
            (12, 2),
            (14, 2),
            (15, 3),
        ];
        for (score, expected) in table {
            assert_eq!(dm(score), expected, "score {score}");
        }
    }

    #[test]
    fn ehex_skips_i_and_o() {
        assert_eq!(ehex(10), Some('A'));
        assert_eq!(ehex(17), Some('H'));
        assert_eq!(ehex(18), Some('J'));
        assert_eq!(ehex(23), Some('P'));
        assert_eq!(ehex(-1), None);
    }

    #[test]
    fn damage_goes_to_end_first() {
        let mut p = Physical::new(7, 10, 8);
        p.apply_damage(5, Overflow::Str);
        assert_eq!((p.str.current, p.dex.current, p.end.current), (7, 10, 3));
        assert_eq!(p.condition(), Condition::Conscious);
    }

    #[test]
    fn excess_goes_to_the_chosen_characteristic_then_the_other() {
        // Core p.77: END to 0, then STR or DEX (target's choice).
        let mut p = Physical::new(7, 10, 8);
        p.apply_damage(12, Overflow::Dex);
        assert_eq!((p.str.current, p.dex.current, p.end.current), (7, 6, 0));
        assert_eq!(p.condition(), Condition::Conscious);

        // DEX reaches 0: unconscious; further damage goes to STR.
        p.apply_damage(9, Overflow::Dex);
        assert_eq!((p.str.current, p.dex.current, p.end.current), (4, 0, 0));
        assert_eq!(p.condition(), Condition::Unconscious);

        // All three at 0: killed.
        p.apply_damage(10, Overflow::Dex);
        assert_eq!(p.condition(), Condition::Dead);
        assert_eq!(p.str.current, 0, "never below zero");
    }

    #[test]
    fn counts_damaged_characteristics() {
        let mut p = Physical::new(7, 10, 8);
        assert_eq!(p.damaged_count(), 0);
        p.apply_damage(10, Overflow::Str);
        assert_eq!(p.damaged_count(), 2);
    }
}
