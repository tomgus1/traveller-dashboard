//! Extracts equipment tables from a Traveller rulebook PDF the group owns
//! into a private catalogue JSON file.
//!
//! ```sh
//! cargo run -p catalogue-extract -- csc-2023 "books/<CSC 2023>.pdf" data/catalogue/csc-2023.json
//! ```
//!
//! The output is copyrighted data: keep it in the git-ignored
//! `data/catalogue/`. Needs poppler's `pdftotext`.

mod items;
mod tables;
mod words;

use std::collections::BTreeMap;
use std::path::Path;
use std::process::ExitCode;

use traveller_model::catalogue::Catalogue;

fn main() -> ExitCode {
    let args: Vec<String> = std::env::args().skip(1).collect();
    let [book_id, pdf, out] = args.as_slice() else {
        let known: Vec<&str> = items::BOOKS.iter().map(|b| b.id).collect();
        eprintln!(
            "usage: catalogue-extract <book> <pdf> <out.json>\n  books: {}",
            known.join(", ")
        );
        return ExitCode::FAILURE;
    };
    let Some(book) = items::BOOKS.iter().find(|b| b.id == book_id) else {
        eprintln!("unknown book {book_id}");
        return ExitCode::FAILURE;
    };

    let pages = match words::read_pdf(Path::new(pdf)) {
        Ok(p) => p,
        Err(e) => {
            eprintln!("{e}");
            return ExitCode::FAILURE;
        }
    };
    let (first, last) = book.pages;
    let tables: Vec<tables::RawTable> = pages
        .iter()
        .filter(|p| {
            let printed = p.number.saturating_sub(book.page_offset);
            (first..=last).contains(&printed)
        })
        .flat_map(|p| tables::find_tables(p.number, p.width, &p.words))
        .collect();
    let items = items::items(book, &tables);

    // A report to review: counts, and rows that look incomplete.
    let mut by_section: BTreeMap<&str, usize> = BTreeMap::new();
    for item in &items {
        *by_section.entry(&item.section).or_default() += 1;
    }
    eprintln!(
        "{} tables, {} items from {}",
        tables.len(),
        items.len(),
        book.title
    );
    for (section, n) in &by_section {
        eprintln!("  {n:4}  {section}");
    }
    let suspect: Vec<_> = items
        .iter()
        .filter(|i| {
            i.tl.is_none()
                || (i.cost.is_none() && !i.columns.get("COST").is_some_and(|c| c.contains('—')))
        })
        .collect();
    eprintln!("{} items to check (no TL, or no price):", suspect.len());
    for item in suspect.iter().take(60) {
        eprintln!("  p.{:<3} {}  {:?}", item.page, item.name, item.columns);
    }

    let catalogue = Catalogue {
        book: book.id.to_string(),
        title: book.title.to_string(),
        items,
    };
    match serde_json::to_string_pretty(&catalogue)
        .map_err(|e| e.to_string())
        .and_then(|json| std::fs::write(out, json + "\n").map_err(|e| e.to_string()))
    {
        Ok(()) => {
            eprintln!("wrote {out}");
            ExitCode::SUCCESS
        }
        Err(e) => {
            eprintln!("couldn't write {out}: {e}");
            ExitCode::FAILURE
        }
    }
}
