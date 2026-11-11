//! Personal combat damage.

/// A weapon's damage dice: "3D-3", "2D", "1D+2", "4DD". Also reads the
/// "4d6" style players often type.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct DamageDice {
    /// How many dice.
    pub dice: u8,
    /// Added to the dice total.
    pub modifier: i32,
    /// DD: destructive, the total is multiplied by ten.
    pub destructive: bool,
}

impl DamageDice {
    /// Reads damage as written; `None` for "Special", "—" and the like.
    /// Anything after the dice ("2D (stun)") is ignored.
    pub fn parse(text: &str) -> Option<Self> {
        let text = text.trim().replace('\u{2212}', "-");
        let digits: String = text.chars().take_while(char::is_ascii_digit).collect();
        let dice: u8 = if digits.is_empty() {
            1
        } else {
            digits.parse().ok()?
        };
        let rest = &text[digits.len()..];
        let rest = rest.strip_prefix(['D', 'd'])?;
        let (destructive, rest) = match rest.strip_prefix(['D', 'd']) {
            Some(r) => (true, r),
            None => (false, rest.strip_prefix('6').unwrap_or(rest)),
        };
        let rest = rest.trim_start();
        let modifier = match rest.chars().next() {
            Some(sign @ ('+' | '-')) => {
                let n: String = rest[1..]
                    .trim_start()
                    .chars()
                    .take_while(char::is_ascii_digit)
                    .collect();
                let n: i32 = n.parse().ok()?;
                if sign == '-' { -n } else { n }
            }
            _ => 0,
        };
        (dice > 0 && dice <= 30).then_some(Self {
            dice,
            modifier,
            destructive,
        })
    }

    /// The damage from these dice rolled as `thrown` (one result per die).
    pub fn total(self, thrown: &[u8]) -> i32 {
        let sum: i32 = thrown.iter().map(|&d| i32::from(d)).sum::<i32>() + self.modifier;
        let sum = sum.max(0);
        if self.destructive { sum * 10 } else { sum }
    }
}

/// Damage that gets through armour (Core p.77).
///
/// `rolled` is the weapon's damage dice total. The attack's Effect is added,
/// then the target's Protection, less the weapon's AP, is subtracted. An
/// attack with Effect 6+ always does at least 1 point. Melee attackers also
/// add their STR DM; include it in `rolled`.
pub fn damage_after_armour(rolled: i32, effect: i32, protection: i32, ap: i32) -> i32 {
    let armour = (protection - ap).max(0);
    let damage = (rolled + effect - armour).max(0);
    if effect >= 6 { damage.max(1) } else { damage }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn reads_damage_dice() {
        let d = |dice, modifier, destructive| {
            Some(DamageDice {
                dice,
                modifier,
                destructive,
            })
        };
        assert_eq!(DamageDice::parse("3D-3"), d(3, -3, false));
        assert_eq!(DamageDice::parse("2D"), d(2, 0, false));
        assert_eq!(DamageDice::parse("1D+2"), d(1, 2, false));
        assert_eq!(DamageDice::parse("4d6"), d(4, 0, false));
        assert_eq!(DamageDice::parse("3d6-3"), d(3, -3, false));
        assert_eq!(DamageDice::parse("2d6 (stun)"), d(2, 0, false));
        assert_eq!(DamageDice::parse("6DD"), d(6, 0, true));
        assert_eq!(DamageDice::parse("D+3"), d(1, 3, false));
        assert_eq!(DamageDice::parse("Special"), None);
        assert_eq!(DamageDice::parse("—"), None);
    }

    #[test]
    fn damage_totals() {
        let dice = DamageDice::parse("3D-3").unwrap();
        assert_eq!(dice.total(&[1, 1, 1]), 0, "never negative");
        assert_eq!(dice.total(&[6, 5, 4]), 12);
        assert_eq!(DamageDice::parse("2DD").unwrap().total(&[3, 4]), 70);
    }

    #[test]
    fn effect_adds_to_damage_and_armour_subtracts() {
        assert_eq!(damage_after_armour(10, 2, 5, 0), 7);
    }

    #[test]
    fn armour_can_stop_all_damage() {
        assert_eq!(damage_after_armour(3, 0, 8, 0), 0);
    }

    #[test]
    fn effect_six_always_does_one_point() {
        // Core p.77.
        assert_eq!(damage_after_armour(1, 6, 20, 0), 1);
        assert_eq!(damage_after_armour(1, 5, 20, 0), 0);
    }

    #[test]
    fn ap_ignores_armour_but_never_below_zero() {
        assert_eq!(damage_after_armour(6, 0, 5, 3), 4);
        assert_eq!(damage_after_armour(6, 0, 2, 5), 6);
    }
}
