//! Starship operations: jump fuel and running costs.
//!
//! Running costs are charged every Maintenance Period of four weeks
//! (Core p.153).

use crate::credits::Credits;

/// Tons of fuel for a jump: 10% of hull tonnage per parsec. Jumps of under
/// one parsec count as one (Core p.157).
pub fn jump_fuel(hull_tons: u32, parsecs: u32) -> u32 {
    let parsecs = parsecs.max(1);
    (hull_tons * parsecs).div_ceil(10)
}

/// Mortgage payment per Maintenance Period: purchase price ÷ 240, paid for
/// 40 years (Core p.149).
pub fn mortgage_payment(purchase_price: Credits) -> Credits {
    purchase_price.div_ceil(240)
}

/// Maintenance per Maintenance Period: 0.1% of the purchase price a year,
/// divided by 12 (Core p.154).
pub fn maintenance(purchase_price: Credits) -> Credits {
    purchase_price.div_ceil(1000 * 12)
}

/// Fuel grade (Core p.154).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Fuel {
    /// Cr500 a ton.
    Refined,
    /// Cr100 a ton. Raises the chance of a misjump (Core p.157).
    Unrefined,
}

/// Cost of buying fuel (Core p.154).
pub fn fuel_cost(tons: u32, grade: Fuel) -> Credits {
    let per_ton = match grade {
        Fuel::Refined => 500,
        Fuel::Unrefined => 100,
    };
    Credits(i64::from(tons) * per_ton)
}

/// Who and what is aboard, for life support costs.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
pub struct Aboard {
    /// Staterooms in use.
    pub staterooms: u32,
    /// People aboard who aren't in low berths (crew and passengers).
    pub people: u32,
    /// Occupied low berths.
    pub low_berths: u32,
}

/// Life support per Maintenance Period (Core p.154): Cr1000 per stateroom,
/// Cr1000 per person not in a low berth, and Cr100 per occupied low berth.
pub fn life_support(aboard: Aboard) -> Credits {
    Credits(
        i64::from(aboard.staterooms) * 1000
            + i64::from(aboard.people) * 1000
            + i64::from(aboard.low_berths) * 100,
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn jump_fuel_example() {
        // Core p.157: a 200-ton ship jumping two parsecs needs 40 tons.
        assert_eq!(jump_fuel(200, 2), 40);
        assert_eq!(jump_fuel(200, 1), 20);
        assert_eq!(jump_fuel(200, 0), 20, "under one parsec counts as one");
    }

    #[test]
    fn free_trader_running_costs() {
        // Core p.194: Free Trader, purchase cost MCr46.332, maintenance
        // cost Cr3861 a month.
        let price = Credits::mcr(46.332);
        assert_eq!(maintenance(price), Credits(3861));
        // Mortgage per Core p.149: price ÷ 240.
        assert_eq!(mortgage_payment(price), Credits(193_050));
    }

    #[test]
    fn fuel_prices() {
        assert_eq!(fuel_cost(40, Fuel::Refined), Credits(20_000));
        assert_eq!(fuel_cost(40, Fuel::Unrefined), Credits(4_000));
    }

    #[test]
    fn life_support_costs() {
        let aboard = Aboard {
            staterooms: 6,
            people: 6,
            low_berths: 4,
        };
        assert_eq!(life_support(aboard), Credits(12_400));
    }
}
