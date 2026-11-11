//! Task checks: difficulty, dice modifiers and Effect.

/// Task difficulty and its target number (Core p.60–61). Checks with no
/// stated difficulty are Average.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
pub enum Difficulty {
    /// 2+
    Simple,
    /// 4+
    Easy,
    /// 6+
    Routine,
    /// 8+
    #[default]
    Average,
    /// 10+
    Difficult,
    /// 12+
    VeryDifficult,
    /// 14+
    Formidable,
    /// 16+
    Impossible,
}

impl Difficulty {
    /// The total needed to succeed.
    pub fn target(self) -> i32 {
        match self {
            Self::Simple => 2,
            Self::Easy => 4,
            Self::Routine => 6,
            Self::Average => 8,
            Self::Difficult => 10,
            Self::VeryDifficult => 12,
            Self::Formidable => 14,
            Self::Impossible => 16,
        }
    }
}

/// DM for using a skill (Core p.58–59): untrained −3, level 0 none, and +1
/// per level above that.
pub fn skill_dm(level: Option<i32>) -> i32 {
    level.map_or(-3, |l| l.max(0))
}

/// How well a check went, by Effect (Core p.61).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Outcome {
    /// Effect −6 or less.
    ExceptionalFailure,
    /// Effect −2 to −5.
    AverageFailure,
    /// Effect −1.
    MarginalFailure,
    /// Effect 0.
    MarginalSuccess,
    /// Effect 1 to 5.
    AverageSuccess,
    /// Effect 6 or more.
    ExceptionalSuccess,
}

impl Outcome {
    /// The band an Effect falls in.
    pub fn from_effect(effect: i32) -> Self {
        match effect {
            i32::MIN..=-6 => Self::ExceptionalFailure,
            -5..=-2 => Self::AverageFailure,
            -1 => Self::MarginalFailure,
            0 => Self::MarginalSuccess,
            1..=5 => Self::AverageSuccess,
            _ => Self::ExceptionalSuccess,
        }
    }

    /// Whether the task succeeded.
    pub fn is_success(self) -> bool {
        matches!(
            self,
            Self::MarginalSuccess | Self::AverageSuccess | Self::ExceptionalSuccess
        )
    }
}

/// The result of a check.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct TaskResult {
    /// Dice plus all DMs.
    pub total: i32,
    /// Total minus the target number (Core p.61).
    pub effect: i32,
    /// The Effect's band.
    pub outcome: Outcome,
}

/// Resolves a check: the 2D result (after any Boon or Bane), plus the sum of
/// all DMs, against the difficulty (Core p.59–61).
pub fn resolve(dice: u8, total_dm: i32, difficulty: Difficulty) -> TaskResult {
    let total = i32::from(dice) + total_dm;
    let effect = total - difficulty.target();
    TaskResult {
        total,
        effect,
        outcome: Outcome::from_effect(effect),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::characteristics::dm;

    #[test]
    fn difficulty_targets() {
        // Core p.61, Task Difficulty table.
        let targets: Vec<i32> = [
            Difficulty::Simple,
            Difficulty::Easy,
            Difficulty::Routine,
            Difficulty::Average,
            Difficulty::Difficult,
            Difficulty::VeryDifficult,
            Difficulty::Formidable,
            Difficulty::Impossible,
        ]
        .map(Difficulty::target)
        .to_vec();
        assert_eq!(targets, [2, 4, 6, 8, 10, 12, 14, 16]);
        assert_eq!(Difficulty::default(), Difficulty::Average);
    }

    #[test]
    fn stealth_example() {
        // Core p.59: Kathya (DEX 10, Stealth 0) → DM+1; Erik (DEX 6,
        // Stealth 2) → DM+2; Morn (DEX 12, no Stealth) → DM-1.
        assert_eq!(dm(10) + skill_dm(Some(0)), 1);
        assert_eq!(dm(6) + skill_dm(Some(2)), 2);
        assert_eq!(dm(12) + skill_dm(None), -1);
    }

    #[test]
    fn carouse_example() {
        // Core p.61: Erik (INT 9, Carouse 1), Difficult (10+): DM+2.
        let modifier = dm(9) + skill_dm(Some(1));
        assert_eq!(modifier, 2);
        assert!(
            !resolve(7, modifier, Difficulty::Difficult)
                .outcome
                .is_success()
        );
        assert!(
            resolve(8, modifier, Difficulty::Difficult)
                .outcome
                .is_success()
        );
    }

    #[test]
    fn effect_example() {
        // Core p.61: rolls 4 and 3, DM+3, Average: total 10, Effect 2.
        let result = resolve(4 + 3, 3, Difficulty::Average);
        assert_eq!(result.total, 10);
        assert_eq!(result.effect, 2);
        assert_eq!(result.outcome, Outcome::AverageSuccess);
    }

    #[test]
    fn effect_bands() {
        // Core p.61, Effect Results table.
        let cases = [
            (-7, Outcome::ExceptionalFailure),
            (-6, Outcome::ExceptionalFailure),
            (-5, Outcome::AverageFailure),
            (-2, Outcome::AverageFailure),
            (-1, Outcome::MarginalFailure),
            (0, Outcome::MarginalSuccess),
            (1, Outcome::AverageSuccess),
            (5, Outcome::AverageSuccess),
            (6, Outcome::ExceptionalSuccess),
        ];
        for (effect, expected) in cases {
            assert_eq!(Outcome::from_effect(effect), expected, "effect {effect}");
        }
        assert!(Outcome::MarginalSuccess.is_success());
        assert!(!Outcome::MarginalFailure.is_success());
    }
}
