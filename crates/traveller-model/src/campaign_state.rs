//! The `campaign_state` document: everything the party shares, which every
//! member can edit (it replaces the spreadsheet a group would keep).
//!
//! Every list item has a stable `id`, so edits can be expressed as "change
//! item X" and replayed on top of someone else's save instead of
//! overwriting it.

use serde::{Deserialize, Serialize};
use traveller_rules::Credits;
use traveller_rules::ship::{self, Aboard};

/// The current document version.
pub const VERSION: u32 = 1;

/// A campaign's shared state.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(default)]
pub struct CampaignState {
    /// Document version; see [`VERSION`].
    pub version: u32,
    /// The current Imperial date.
    pub date: Option<ImperialDate>,
    /// Where the party is, e.g. "Halcyon Highport".
    pub location: String,
    /// The party's ship.
    pub ship: Ship,
    /// Party funds and their ledger.
    pub funds: Funds,
    /// The ship's own account (running costs, fuel, repairs), kept apart
    /// from the party's money.
    pub ship_fund: Funds,
    /// Shared gear aboard.
    pub locker: Vec<LockerItem>,
    /// Cargo in the hold.
    pub cargo: Vec<CargoLot>,
    /// Freight, passenger, mail and charter contracts.
    pub contracts: Vec<Contract>,
    /// Speculative trades: what was bought and sold where.
    pub trades: Vec<Trade>,
    /// Travel: next jump, worlds, missions and journal.
    pub travel: Travel,
}

impl Default for CampaignState {
    fn default() -> Self {
        Self {
            version: VERSION,
            date: None,
            location: String::new(),
            ship: Ship::default(),
            funds: Funds::default(),
            ship_fund: Funds::default(),
            locker: Vec::new(),
            cargo: Vec::new(),
            contracts: Vec::new(),
            trades: Vec::new(),
            travel: Travel::default(),
        }
    }
}

impl CampaignState {
    /// Tons of cargo in the hold.
    pub fn cargo_tons(&self) -> u32 {
        self.cargo.iter().map(|c| c.tons).sum::<u32>()
            + self
                .contracts
                .iter()
                .filter(|c| c.status == ContractStatus::Aboard)
                .filter_map(|c| c.tons)
                .sum::<u32>()
    }
}

/// An Imperial date: day of year (1–365) and year.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub struct ImperialDate {
    /// 1–365.
    pub day: u16,
    /// e.g. 1105.
    pub year: u32,
}

impl ImperialDate {
    /// "105-1105".
    pub fn label(self) -> String {
        format!("{:03}-{}", self.day, self.year)
    }

    /// The date `days` later, rolling into the next year after day 365.
    #[must_use]
    pub fn plus_days(self, days: u32) -> Self {
        let total = u32::from(self.day) - 1 + days;
        Self {
            day: u16::try_from(total % 365 + 1).unwrap_or(1),
            year: self.year + total / 365,
        }
    }
}

/// The party's starship.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, Default)]
#[serde(default)]
#[allow(missing_docs)]
pub struct Ship {
    pub name: String,
    /// e.g. "Free Trader".
    pub class: String,
    /// Hull tonnage (displacement).
    pub tons: u32,
    pub tl: Option<u8>,
    /// e.g. "Streamlined".
    pub configuration: String,
    /// Hull points: maximum and current.
    pub hull_max: u32,
    pub hull: Option<u32>,
    pub armour: i32,
    /// Manoeuvre drive rating.
    pub thrust: u8,
    /// Jump drive rating (parsecs per jump).
    pub jump: u8,
    pub power: Option<u32>,
    /// Fuel: tank capacity and tons aboard.
    pub fuel_capacity: u32,
    pub fuel: u32,
    pub cargo_capacity: u32,
    pub staterooms: u32,
    pub low_berths: u32,
    /// People aboard outside low berths (crew and passengers).
    pub people_aboard: u32,
    pub low_berths_occupied: u32,
    /// Credits paid for the ship (sets mortgage and maintenance).
    pub purchase_price: i64,
    /// Mortgage still owed; zero when owned outright.
    pub mortgage_remaining: i64,
    /// Hired crew's pay per Maintenance Period.
    pub crew_salaries: i64,
    /// Free text: sensors, computer, software, fittings.
    pub systems: String,
    pub weapons: String,
    /// Who fills each crew position.
    pub crew: Vec<CrewPosition>,
}

impl Ship {
    /// Current hull points (full when not recorded).
    pub fn hull_now(&self) -> u32 {
        self.hull.unwrap_or(self.hull_max)
    }

    /// Fuel for a jump of `parsecs` (Core p.157).
    pub fn jump_fuel(&self, parsecs: u32) -> u32 {
        ship::jump_fuel(self.tons, parsecs)
    }

    /// Running costs per Maintenance Period of four weeks (Core p.149,
    /// p.154): mortgage (while owed), maintenance, life support, salaries.
    pub fn running_costs(&self) -> RunningCosts {
        let price = Credits(self.purchase_price);
        RunningCosts {
            mortgage: if self.mortgage_remaining > 0 {
                ship::mortgage_payment(price)
            } else {
                Credits::ZERO
            },
            maintenance: ship::maintenance(price),
            life_support: ship::life_support(Aboard {
                staterooms: self.staterooms,
                people: self.people_aboard,
                low_berths: self.low_berths_occupied,
            }),
            salaries: Credits(self.crew_salaries),
        }
    }
}

/// Costs per Maintenance Period.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
#[allow(missing_docs)]
pub struct RunningCosts {
    pub mortgage: Credits,
    pub maintenance: Credits,
    pub life_support: Credits,
    pub salaries: Credits,
}

impl RunningCosts {
    /// All of them together.
    pub fn total(self) -> Credits {
        self.mortgage + self.maintenance + self.life_support + self.salaries
    }
}

/// A crew position and who fills it.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(default)]
#[allow(missing_docs)]
pub struct CrewPosition {
    pub id: String,
    /// e.g. "Pilot".
    pub role: String,
    /// Who fills it; empty when vacant.
    pub filled_by: String,
    /// The relevant skill, e.g. "Pilot 2".
    pub skill: String,
}

/// Party funds.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(default)]
pub struct Funds {
    /// Credits in the ship's account.
    pub balance: i64,
    /// Transactions, newest last.
    pub ledger: Vec<FundsEntry>,
}

/// A party funds transaction.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(default)]
#[allow(missing_docs)]
pub struct FundsEntry {
    pub id: String,
    /// Imperial or calendar date, as entered.
    pub date: String,
    pub description: String,
    /// Credits; negative for spending.
    pub amount: i64,
    /// e.g. "Expense / Fuel".
    pub category: String,
    /// Who paid or received it.
    pub by: String,
    pub notes: String,
}

/// Shared gear in the ship's locker.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(default)]
#[allow(missing_docs)]
pub struct LockerItem {
    pub id: String,
    pub name: String,
    pub quantity: u32,
    /// Who has it; empty when in the locker.
    pub signed_out_to: String,
    pub notes: String,
}

impl Default for LockerItem {
    fn default() -> Self {
        Self {
            id: String::new(),
            name: String::new(),
            quantity: 1,
            signed_out_to: String::new(),
            notes: String::new(),
        }
    }
}

/// A lot of speculative cargo in the hold.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(default)]
#[allow(missing_docs)]
pub struct CargoLot {
    pub id: String,
    pub goods: String,
    pub tons: u32,
    /// Credits paid for the whole lot.
    pub paid: i64,
    pub bought_at: String,
    pub destination: String,
    pub notes: String,
}

/// What kind of contract.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(rename_all = "snake_case")]
#[allow(missing_docs)]
pub enum ContractKind {
    #[default]
    Freight,
    Passengers,
    Mail,
    Charter,
    Other,
}

/// Where a contract stands.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(rename_all = "snake_case")]
pub enum ContractStatus {
    /// Agreed, not loaded yet.
    #[default]
    Booked,
    /// Loaded or boarded.
    Aboard,
    /// Delivered and paid.
    Delivered,
}

/// A freight, passenger, mail or charter contract.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(default)]
#[allow(missing_docs)]
pub struct Contract {
    pub id: String,
    pub kind: ContractKind,
    pub description: String,
    pub tons: Option<u32>,
    pub passengers: Option<u32>,
    /// Credits on delivery.
    pub payment: i64,
    pub destination: String,
    pub status: ContractStatus,
}

/// Buying or selling.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(rename_all = "snake_case")]
#[allow(missing_docs)]
pub enum TradeSide {
    #[default]
    Buy,
    Sell,
}

/// A speculative trade, as players log them.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(default)]
#[allow(missing_docs)]
pub struct Trade {
    pub id: String,
    pub date: String,
    pub world: String,
    pub side: TradeSide,
    pub goods: String,
    pub tons: u32,
    /// Credits per ton.
    pub price_per_ton: i64,
    /// Who made the deal.
    pub by: String,
    pub notes: String,
}

impl Trade {
    /// Total value: positive for a sale, negative for a purchase.
    pub fn total(&self) -> Credits {
        let value = Credits(self.price_per_ton) * i64::from(self.tons);
        match self.side {
            TradeSide::Sell => value,
            TradeSide::Buy => -value,
        }
    }
}

/// Travel: the next jump, worlds visited, missions and the journal.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(default)]
#[allow(missing_docs)]
pub struct Travel {
    pub next_destination: String,
    pub next_parsecs: Option<u32>,
    pub worlds: Vec<World>,
    pub missions: Vec<Mission>,
    pub journal: Vec<JournalEntry>,
}

/// A world visited.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(default)]
#[allow(missing_docs)]
pub struct World {
    pub id: String,
    pub name: String,
    /// Universal World Profile, e.g. "B867A69-C".
    pub uwp: String,
    pub notes: String,
}

/// A patron's job.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(default)]
#[allow(missing_docs)]
pub struct Mission {
    pub id: String,
    pub patron: String,
    pub job: String,
    pub reward: Option<i64>,
    /// e.g. "Offered", "Active", "Done".
    pub status: String,
}

/// A journal entry.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(default)]
#[allow(missing_docs)]
pub struct JournalEntry {
    pub id: String,
    pub date: String,
    pub title: String,
    pub text: String,
    pub by: String,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn empty_documents_load() {
        let state: CampaignState = serde_json::from_str("{}").unwrap();
        assert_eq!(state, CampaignState::default());
        assert_eq!(state.version, VERSION);
    }

    #[test]
    fn free_trader_running_costs_match_the_book() {
        // Core p.194: Free Trader, MCr46.332, maintenance Cr3861.
        let ship = Ship {
            tons: 200,
            purchase_price: 46_332_000,
            mortgage_remaining: 30_000_000,
            staterooms: 6,
            people_aboard: 6,
            ..Ship::default()
        };
        let costs = ship.running_costs();
        assert_eq!(costs.maintenance, Credits(3861));
        assert_eq!(costs.mortgage, Credits(193_050));
        assert_eq!(costs.life_support, Credits(12_000));
        assert_eq!(costs.total(), Credits(208_911));
        assert_eq!(ship.jump_fuel(1), 20);

        let owned = Ship {
            mortgage_remaining: 0,
            ..ship
        };
        assert_eq!(owned.running_costs().mortgage, Credits::ZERO);
    }

    #[test]
    fn imperial_dates_roll_over() {
        let date = ImperialDate {
            day: 360,
            year: 1105,
        };
        assert_eq!(date.label(), "360-1105");
        assert_eq!(date.plus_days(7), ImperialDate { day: 2, year: 1106 });
        assert_eq!(ImperialDate { day: 5, year: 1105 }.label(), "005-1105");
    }

    #[test]
    fn trades_and_cargo_add_up() {
        let mut state = CampaignState::default();
        state.trades.push(Trade {
            side: TradeSide::Buy,
            tons: 20,
            price_per_ton: 4000,
            ..Trade::default()
        });
        assert_eq!(state.trades[0].total(), Credits(-80_000));
        state.cargo.push(CargoLot {
            tons: 40,
            ..CargoLot::default()
        });
        state.contracts.push(Contract {
            tons: Some(8),
            status: ContractStatus::Aboard,
            ..Contract::default()
        });
        state.contracts.push(Contract {
            tons: Some(30),
            status: ContractStatus::Booked,
            ..Contract::default()
        });
        assert_eq!(state.cargo_tons(), 48, "booked freight isn't aboard yet");
    }

    /// Checks states produced by the database migrations (08, 09) load.
    /// Run `TD_EXPORT_DIR=… database/tests/run.sh` and point
    /// `TD_STATES_JSONL` at the exported file; skipped when unset.
    #[test]
    fn migrated_states_load() {
        let Ok(path) = std::env::var("TD_STATES_JSONL") else {
            return;
        };
        let text = std::fs::read_to_string(path).unwrap();
        let mut count = 0;
        for line in text.lines().filter(|l| !l.trim().is_empty()) {
            let state: CampaignState = serde_json::from_str(line)
                .unwrap_or_else(|e| panic!("migrated state didn't load: {e}\n{line}"));
            let total: i64 = state.ship_fund.ledger.iter().map(|e| e.amount).sum();
            assert_eq!(state.ship_fund.balance, total, "ship balance = its ledger");
            count += 1;
        }
        assert!(count > 0, "no states in file");
    }

    #[test]
    fn round_trips_through_json() {
        let mut state = CampaignState {
            date: Some(ImperialDate {
                day: 105,
                year: 1105,
            }),
            ..CampaignState::default()
        };
        state.contracts.push(Contract {
            id: "c1".into(),
            kind: ContractKind::Mail,
            status: ContractStatus::Aboard,
            ..Contract::default()
        });
        let json = serde_json::to_value(&state).unwrap();
        assert_eq!(json["contracts"][0]["kind"], "mail");
        assert_eq!(json["contracts"][0]["status"], "aboard");
        assert_eq!(
            serde_json::from_value::<CampaignState>(json).unwrap(),
            state
        );
    }
}
