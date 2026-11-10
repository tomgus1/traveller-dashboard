//! Medical treatment and natural healing (Core p.82–83).

use crate::characteristics::{Physical, dm};

/// Points restored by successful first aid: the Medic check's Effect, at
/// least 1 (Core p.82). First aid can only be applied once per injury.
pub fn first_aid(effect: i32) -> i32 {
    effect.max(1)
}

/// What treatment an injured Traveller needs (Core p.82–83).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Treatment {
    /// Nothing is damaged.
    None,
    /// One or two damaged physical characteristics: medical care applies.
    MedicalCare,
    /// All three damaged: surgery first.
    Surgery,
}

/// Treatment needed, given the damage remaining after first aid.
pub fn treatment_needed(physical: &Physical) -> Treatment {
    match physical.damaged_count() {
        0 => Treatment::None,
        3 => Treatment::Surgery,
        _ => Treatment::MedicalCare,
    }
}

/// Points lost when surgery fails: 3 plus the (negative) Effect, so a
/// worse failure loses more (Core p.82).
pub fn failed_surgery_loss(effect: i32) -> i32 {
    3 + effect.abs()
}

/// Points restored per day of medical care: 3 + END DM + the doctor's Medic
/// skill, divided among the damaged characteristics (Core p.83).
pub fn medical_care_per_day(end: i32, medic_skill: i32) -> i32 {
    (3 + dm(end) + medic_skill).max(0)
}

/// Points regained per day of full rest without treatment (Core p.83):
/// 1D + END DM, or just END DM if the Traveller still needs surgery (which
/// can make them worse when it's negative).
pub fn natural_healing_per_day(roll_1d: u8, end: i32, needs_surgery: bool) -> i32 {
    if needs_surgery {
        dm(end)
    } else {
        i32::from(roll_1d) + dm(end)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::characteristics::Overflow;

    #[test]
    fn first_aid_restores_at_least_one() {
        assert_eq!(first_aid(4), 4);
        assert_eq!(first_aid(0), 1);
    }

    #[test]
    fn three_damaged_needs_surgery_fewer_needs_care() {
        let mut p = Physical::new(7, 7, 7);
        assert_eq!(treatment_needed(&p), Treatment::None);
        p.apply_damage(9, Overflow::Str); // END 0, STR 5
        assert_eq!(treatment_needed(&p), Treatment::MedicalCare);
        p.apply_damage(7, Overflow::Str); // STR 0, DEX 5
        assert_eq!(treatment_needed(&p), Treatment::Surgery);
    }

    #[test]
    fn failed_surgery_costs_three_plus_effect() {
        assert_eq!(failed_surgery_loss(-1), 4);
        assert_eq!(failed_surgery_loss(-4), 7);
    }

    #[test]
    fn medical_care_rate() {
        // END 9 (DM+1), doctor with Medic 2: 3 + 1 + 2 = 6 per day.
        assert_eq!(medical_care_per_day(9, 2), 6);
    }

    #[test]
    fn natural_healing_rate() {
        assert_eq!(natural_healing_per_day(4, 8, false), 4);
        assert_eq!(natural_healing_per_day(4, 2, true), -2, "worsens");
    }
}
