//! Personal combat damage.

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
