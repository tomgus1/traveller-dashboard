//! The Trade Goods table (Core p.244–245): D66, type, availability, tons,
//! base price, purchase and sale DMs, examples.
//!
//! It's printed sideways across two pages, so the words are turned upright
//! first. The second page has no header row; it reuses the first's
//! columns.

use std::collections::BTreeMap;

use traveller_model::catalogue::{CatalogueItem, ItemKind, TradeStats};

use crate::items::{Book, credits, slug};
use crate::words::{Page, Word, lines};

/// The header words, in order, and the column each starts.
const HEADER: [(&str, &str); 8] = [
    ("D66", "D66"),
    ("Type", "TYPE"),
    ("Availability", "AVAILABILITY"),
    ("Tons", "TONS"),
    ("Base", "BASE PRICE"),
    ("Purchase", "PURCHASE DM"),
    ("Sale", "SALE DM"),
    ("Examples", "EXAMPLES"),
];

/// A word turned upright from text reading bottom to top: its start is the
/// bottom of its box, and lines advance left to right.
fn upright(w: &Word) -> Word {
    Word {
        x0: 1000.0 - w.y1,
        x1: 1000.0 - w.y0,
        y0: w.x0,
        y1: w.x1,
        text: w.text.clone(),
    }
}

/// Where each column starts, if this line is the table's header.
fn header(line: &[Word]) -> Option<Vec<(&'static str, f64)>> {
    let mut out = Vec::new();
    let mut words = line.iter();
    for (word, column) in HEADER {
        let found = words.by_ref().find(|w| w.text == word)?;
        out.push((column, found.x0));
    }
    Some(out)
}

fn is_d66(text: &str) -> bool {
    let b = text.as_bytes();
    b.len() == 2 && b.iter().all(|c| (b'1'..=b'6').contains(c))
}

/// Joins a cell's words, closing up words broken at a hyphen ("Non-" +
/// "Industrial").
fn join(words: &[&str]) -> String {
    let mut out = String::new();
    for w in words {
        if !out.is_empty() && !out.ends_with('-') {
            out.push(' ');
        }
        out.push_str(w);
    }
    out
}

/// The rows of a trade table on one page's (upright) words: each a map of
/// column to text. `columns` comes from the header, on this page or the
/// one before.
fn rows(words: &[Word], columns: &[(&'static str, f64)]) -> Vec<BTreeMap<&'static str, String>> {
    let Some(&(_, code_x)) = columns.first() else {
        return Vec::new();
    };
    let column_of = |x: f64| {
        columns
            .iter()
            .rev()
            .find(|(_, start)| *start <= x + 4.0)
            .map(|(name, _)| *name)
    };
    let mut out: Vec<BTreeMap<&'static str, Vec<&str>>> = Vec::new();
    let all = lines(words, 3.0);
    let mut started = false;
    for line in &all {
        let Some(first) = line.first() else { continue };
        if header(line).is_some() {
            started = true;
            continue;
        }
        let at_code = (first.x0 - code_x).abs() < 8.0;
        if at_code && is_d66(&first.text) {
            started = true;
            out.push(BTreeMap::new());
        } else if !started || out.is_empty() {
            continue;
        } else if first.x0 < code_x - 10.0 {
            // Left of the table: the page number or other text.
            break;
        }
        let Some(row) = out.last_mut() else { continue };
        for w in line {
            if let Some(column) = column_of(w.x0) {
                row.entry(column).or_default().push(w.text.as_str());
            }
        }
    }
    out.into_iter()
        .map(|row| row.into_iter().map(|(k, v)| (k, join(&v))).collect())
        .collect()
}

/// Every trade good in the book's pages (`(pdf page, printed page)`),
/// as catalogue items. Rows without a price (Exotics) are left out.
pub fn trade_goods(book: &Book, pages: &[&Page]) -> Vec<CatalogueItem> {
    let mut out = Vec::new();
    let mut carried: Option<Vec<(&'static str, f64)>> = None;
    for page in pages {
        let words: Vec<Word> = page.words.iter().map(upright).collect();
        let found = lines(&words, 3.0).iter().find_map(|l| header(l));
        let Some(columns) = found.or_else(|| carried.take()) else {
            continue;
        };
        let printed = page.number.saturating_sub(book.page_offset);
        let rows = rows(&words, &columns);
        if rows.is_empty() {
            continue;
        }
        for row in rows {
            let cell = |c: &str| row.get(c).cloned().unwrap_or_default();
            let name = cell("TYPE");
            let Some(cost) = credits(&cell("BASE PRICE")) else {
                continue;
            };
            out.push(CatalogueItem {
                id: format!("{}/trade-{}-{}", book.id, cell("D66"), slug(&name)),
                book: book.id.to_string(),
                page: printed,
                section: "Trade".into(),
                kind: ItemKind::TradeGood,
                name: name.clone(),
                tl: None,
                cost: Some(cost),
                kg: None,
                weapon: None,
                armour: None,
                trade: Some(TradeStats {
                    d66: cell("D66"),
                    availability: cell("AVAILABILITY"),
                    tons: cell("TONS"),
                    purchase_dm: cell("PURCHASE DM"),
                    sale_dm: cell("SALE DM"),
                    examples: cell("EXAMPLES"),
                }),
                effect: String::new(),
                columns: row
                    .iter()
                    .map(|(k, v)| ((*k).to_string(), v.clone()))
                    .collect(),
            });
        }
        carried = Some(columns);
    }
    out
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::words::word;

    fn line(y: f64, cells: &[(f64, &str)]) -> Vec<Word> {
        cells
            .iter()
            .flat_map(|(x, text)| {
                let mut x = *x;
                text.split(' ')
                    .map(|t| {
                        let w = word(x, y, t);
                        x = w.x1 + 4.0;
                        w
                    })
                    .collect::<Vec<_>>()
            })
            .collect()
    }

    const X: [f64; 8] = [10.0, 40.0, 140.0, 240.0, 300.0, 380.0, 500.0, 620.0];

    #[test]
    fn reads_rows_spread_over_lines() {
        let mut words = line(
            10.0,
            &[
                (X[0], "D66"),
                (X[1], "Type"),
                (X[2], "Availability"),
                (X[3], "Tons"),
                (X[4], "Base Price"),
                (X[5], "Purchase DM"),
                (X[6], "Sale DM"),
                (X[7], "Examples"),
            ],
        );
        words.extend(line(
            30.0,
            &[
                // Invented goods: the book's table isn't in this repository.
                (X[0], "11"),
                (X[1], "Hullpaint"),
                (X[2], "Garden"),
                (X[3], "3D x 2"),
                (X[4], "Cr1234"),
                (X[5], "Garden +1,"),
                (X[6], "Ice-"),
                (X[7], "Shiny coatings"),
            ],
        ));
        words.extend(line(
            42.0,
            &[(X[1], "Pigments"), (X[5], "Poor +4"), (X[6], "Capped +3")],
        ));
        words.extend(line(
            60.0,
            &[(X[0], "66"), (X[1], "Oddments"), (X[2], "Anything at all")],
        ));
        words.extend(line(80.0, &[(0.0, "301")]));

        let columns = lines(&words, 3.0).iter().find_map(|l| header(l)).unwrap();
        let rows = rows(&words, &columns);
        assert_eq!(rows.len(), 2);
        assert_eq!(rows[0]["TYPE"], "Hullpaint Pigments");
        assert_eq!(rows[0]["TONS"], "3D x 2");
        assert_eq!(rows[0]["PURCHASE DM"], "Garden +1, Poor +4");
        assert_eq!(rows[0]["SALE DM"], "Ice-Capped +3");
        assert_eq!(rows[1]["TYPE"], "Oddments");
        assert!(!rows[1].contains_key("BASE PRICE"));
    }

    #[test]
    fn turns_sideways_words_upright() {
        // Bottom-to-top text: starts at the bottom of its box.
        let w = Word {
            x0: 46.0,
            y0: 679.0,
            x1: 54.0,
            y1: 709.0,
            text: "Hullpaint".into(),
        };
        let u = upright(&w);
        assert!((u.x0 - 291.0).abs() < 1e-9 && (u.y0 - 46.0).abs() < 1e-9);
        assert!(is_d66("36") && !is_d66("37") && !is_d66("244"));
    }
}
