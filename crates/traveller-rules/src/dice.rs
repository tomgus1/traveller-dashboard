//! Dice: 2D rolls with Boons and Banes.

/// A source of six-sided dice. The app implements this with a real random
/// number generator; tests use fixed sequences.
pub trait Dice {
    /// One die: 1 to 6.
    fn d6(&mut self) -> u8;
}

/// Extra-dice condition on a check (Core p.61).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
pub enum Modifier {
    /// Roll 2D.
    #[default]
    None,
    /// Roll 3D and keep the highest two.
    Boon,
    /// Roll 3D and keep the lowest two.
    Bane,
}

impl Modifier {
    /// Combines the Boons and Banes on a check: only one of each can apply,
    /// and a Boon and a Bane cancel out (Core p.61).
    pub fn combine(boons: usize, banes: usize) -> Self {
        match (boons > 0, banes > 0) {
            (true, false) => Self::Boon,
            (false, true) => Self::Bane,
            _ => Self::None,
        }
    }
}

/// The total of a 2D roll from the dice actually thrown: two dice normally,
/// three with a Boon (drop the lowest) or a Bane (drop the highest).
///
/// # Panics
/// If the number of dice doesn't match the modifier, or a die isn't 1–6.
pub fn total(dice: &[u8], modifier: Modifier) -> u8 {
    let expected = if modifier == Modifier::None { 2 } else { 3 };
    assert_eq!(dice.len(), expected, "{modifier:?} needs {expected} dice");
    assert!(dice.iter().all(|d| (1..=6).contains(d)), "dice must be 1-6");

    let mut sorted = dice.to_vec();
    sorted.sort_unstable();
    // Sorted ascending: a Boon keeps the top two; otherwise (two dice, or a
    // Bane dropping the highest) the bottom two.
    if modifier == Modifier::Boon {
        sorted[1] + sorted[2]
    } else {
        sorted[0] + sorted[1]
    }
}

/// Rolls 2D with any Boon or Bane.
pub fn roll_2d(dice: &mut impl Dice, modifier: Modifier) -> u8 {
    let count = if modifier == Modifier::None { 2 } else { 3 };
    let thrown: Vec<u8> = (0..count).map(|_| dice.d6()).collect();
    total(&thrown, modifier)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn boon_keeps_highest_two_bane_keeps_lowest_two() {
        assert_eq!(total(&[2, 5], Modifier::None), 7);
        assert_eq!(total(&[1, 4, 6], Modifier::Boon), 10);
        assert_eq!(total(&[1, 4, 6], Modifier::Bane), 5);
    }

    #[test]
    fn boons_and_banes_cancel_and_never_stack() {
        assert_eq!(Modifier::combine(1, 1), Modifier::None);
        assert_eq!(Modifier::combine(3, 0), Modifier::Boon);
        assert_eq!(Modifier::combine(0, 2), Modifier::Bane);
        assert_eq!(Modifier::combine(2, 1), Modifier::None);
    }

    struct Fixed(Vec<u8>);
    impl Dice for Fixed {
        fn d6(&mut self) -> u8 {
            self.0.remove(0)
        }
    }

    #[test]
    fn rolls_the_right_number_of_dice() {
        assert_eq!(roll_2d(&mut Fixed(vec![3, 4]), Modifier::None), 7);
        assert_eq!(roll_2d(&mut Fixed(vec![6, 1, 2]), Modifier::Boon), 8);
    }

    #[test]
    #[should_panic(expected = "Boon needs 3 dice")]
    fn rejects_wrong_dice_count() {
        total(&[3, 4], Modifier::Boon);
    }
}
