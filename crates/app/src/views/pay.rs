//! Paying for something added to a list: taking its cost from a balance in
//! the same document and recording it in that ledger, in one change with
//! the item so the two can't get out of step.

use serde_json::{Map, Value, json};
use traveller_model::campaign_state::ImperialDate;
use traveller_rules::Credits;

use super::doc::{DocChange, Target, at, new_id};

/// Where money can come from.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct PaySource {
    /// e.g. "Cash on hand".
    pub label: &'static str,
    /// Dotted path to the balance, e.g. "finances.cash".
    pub balance: &'static str,
    /// Dotted path to its ledger.
    pub ledger: &'static str,
    /// A campaign fund: entries get ids, the campaign's Imperial date and
    /// a category.
    pub shared: bool,
}

/// A character's cash (sheet).
pub const CASH: PaySource = PaySource {
    label: "Cash on hand",
    balance: "finances.cash",
    ledger: "finances.ledger",
    shared: false,
};

/// The party's funds (campaign).
pub const PARTY_FUND: PaySource = PaySource {
    label: "Party funds",
    balance: "funds.balance",
    ledger: "funds.ledger",
    shared: true,
};

/// The ship's account (campaign).
pub const SHIP_FUND: PaySource = PaySource {
    label: "Ship fund",
    balance: "ship_fund.balance",
    ledger: "ship_fund.ledger",
    shared: true,
};

/// Sources for a character's gear.
pub const SHEET_SOURCES: &[PaySource] = &[CASH];
/// Sources for the campaign's shared gear.
pub const CAMPAIGN_SOURCES: &[PaySource] = &[PARTY_FUND, SHIP_FUND];

/// What a new entry costs: its unit cost (the form's, else the catalogue
/// price) times its quantity (1 if it has none).
pub fn price(fields: &Map<String, Value>, catalogue_cost: Option<i64>) -> Option<i64> {
    let unit = fields
        .get("cost")
        .and_then(Value::as_i64)
        .or(catalogue_cost)?;
    let quantity = fields.get("quantity").and_then(Value::as_i64).unwrap_or(1);
    Some(unit.saturating_mul(quantity))
}

/// The balance a source holds in `doc`.
pub fn balance(source: PaySource, doc: &Value) -> i64 {
    at(doc, source.balance).and_then(Value::as_i64).unwrap_or(0)
}

/// The date for a ledger entry: the campaign's Imperial date for a shared
/// fund (blank if not set), else today's calendar date.
fn entry_date(source: PaySource, doc: &Value) -> String {
    if source.shared {
        at(doc, "date")
            .cloned()
            .and_then(|v| serde_json::from_value::<ImperialDate>(v).ok())
            .map(ImperialDate::label)
            .unwrap_or_default()
    } else {
        let date = js_sys::Date::new_0();
        format!(
            "{:04}-{:02}-{:02}",
            date.get_full_year(),
            date.get_month() + 1,
            date.get_date()
        )
    }
}

/// The change that pays `amount` from `source` for `what`, or why it
/// can't: not enough money.
pub fn payment(
    source: PaySource,
    doc: &Value,
    amount: i64,
    what: &str,
) -> Result<DocChange, String> {
    let have = balance(source, doc);
    if amount > have {
        return Err(format!(
            "Not enough in {}: it costs {} and there's {}.",
            source.label.to_lowercase(),
            Credits(amount),
            Credits(have)
        ));
    }
    let id = if source.shared {
        new_id()
    } else {
        String::new()
    };
    Ok(payment_change(
        source,
        &entry_date(source, doc),
        id,
        amount,
        what,
    ))
}

/// `id` is the ledger entry's (empty for a sheet's ledger, which has none).
fn payment_change(source: PaySource, date: &str, id: String, amount: i64, what: &str) -> DocChange {
    let entry = if source.shared {
        json!({ "date": date, "description": what, "amount": -amount, "category": "Expense / Equipment" })
    } else {
        json!({ "date": date, "description": what, "amount": -amount })
    };
    let Value::Object(fields) = entry else {
        unreachable!("json! object")
    };
    DocChange::Batch(vec![
        DocChange::Increment {
            path: source.balance,
            by: -amount,
        },
        DocChange::Upsert {
            path: source.ledger,
            target: Target::New(id),
            fields,
        },
    ])
}

#[cfg(test)]
mod tests {
    use super::*;

    fn map(v: Value) -> Map<String, Value> {
        match v {
            Value::Object(m) => m,
            _ => Map::new(),
        }
    }

    #[test]
    fn price_is_unit_cost_times_quantity() {
        assert_eq!(price(&map(json!({"cost": 150})), None), Some(150));
        assert_eq!(
            price(&map(json!({"cost": 10, "quantity": 3})), None),
            Some(30)
        );
        assert_eq!(
            price(&map(json!({"quantity": 2})), Some(500)),
            Some(1000),
            "catalogue price"
        );
        assert_eq!(price(&map(json!({"cost": null})), None), None);
    }

    #[test]
    fn paying_from_cash_records_it() {
        let mut doc = json!({"finances": {"cash": 1000, "ledger": []}});
        payment_change(CASH, "2026-11-11", String::new(), 150, "Bought Revolver")
            .apply_to(&mut doc);
        assert_eq!(doc["finances"]["cash"], 850);
        assert_eq!(
            doc["finances"]["ledger"][0],
            json!({"date": "2026-11-11", "description": "Bought Revolver", "amount": -150})
        );
    }

    #[test]
    fn campaign_funds_get_a_category() {
        let mut doc = json!({"funds": {"balance": 5000}});
        payment_change(PARTY_FUND, "105-1105", "e1".into(), 2000, "Bought Medikit")
            .apply_to(&mut doc);
        assert_eq!(doc["funds"]["balance"], 3000);
        let entry = &doc["funds"]["ledger"][0];
        assert_eq!(entry["id"], "e1");
        assert_eq!(entry["category"], "Expense / Equipment");
        assert_eq!(entry["date"], "105-1105");
    }

    #[test]
    fn balances_read_from_the_document() {
        let doc = json!({"ship_fund": {"balance": 42}});
        assert_eq!(balance(SHIP_FUND, &doc), 42);
        assert_eq!(balance(PARTY_FUND, &doc), 0, "missing is zero");
    }
}
