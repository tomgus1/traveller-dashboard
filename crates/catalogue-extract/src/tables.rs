//! Finding equipment tables on a page from word positions.

use crate::words::{Word, lines};

/// Single-word column headings that can follow TL.
const HEADINGS: &[&str] = &[
    "TL",
    "COST",
    "KG",
    "MASS",
    "RANGE",
    "DAMAGE",
    "MAGAZINE",
    "TRAITS",
    "PROTECTION",
    "RAD",
    "SKILL",
    "EFFECT",
    "IMPROVEMENT",
    "IMPROVEMENTS",
    "BANDWIDTH",
    "TONS",
    "FEATURES",
    "PROCESSING",
];

/// Two-word headings, joined.
const PAIRS: &[(&str, &str)] = &[
    ("MAGAZINE", "COST"),
    ("PACK", "COST"),
    ("REQUIRED", "SKILL"),
];

/// A column: its heading and where it starts.
#[derive(Debug, Clone, PartialEq)]
pub struct Column {
    /// Upper-case heading, e.g. "MAGAZINE COST"; the first column keeps its
    /// printed text (e.g. "WEAPON", "Filter Mask").
    pub label: String,
    pub x0: f64,
}

/// A table as printed: headings and rows of cells (one per column).
#[derive(Debug, Clone, PartialEq)]
pub struct RawTable {
    /// PDF page number.
    pub page: u32,
    pub columns: Vec<Column>,
    pub rows: Vec<Vec<String>>,
}

impl RawTable {
    /// Index of a column by heading.
    pub fn column(&self, label: &str) -> Option<usize> {
        self.columns
            .iter()
            .position(|c| c.label.eq_ignore_ascii_case(label))
    }
}

fn is_heading(text: &str) -> bool {
    HEADINGS.iter().any(|h| h.eq_ignore_ascii_case(text))
}

/// A table's header found on a line, and its horizontal bounds.
#[derive(Debug, Clone, PartialEq)]
struct Header {
    columns: Vec<Column>,
    left: f64,
    right: f64,
    y: f64,
    /// The table starts with TL ("TL FEATURES COST"): the item is named in
    /// the paragraph above, and the first column is a placeholder for it.
    nameless: bool,
}

/// Headers on one line: one per "TL" with a cost or mass column after it,
/// either with a name heading before it or starting the table itself.
/// `page_width` splits two-column pages.
fn headers_on(line: &[Word], page_width: f64) -> Vec<Header> {
    let mid = page_width / 2.0;
    let mut found = Vec::new();
    for (tl_index, tl) in line.iter().enumerate() {
        if !tl.text.eq_ignore_ascii_case("TL") {
            continue;
        }
        // Some tables put headings before TL ("ARMOUR TYPE PROTECTION TL").
        let mut pre = tl_index;
        while pre > 0 && is_heading(&line[pre - 1].text) && line[pre].x0 - line[pre - 1].x1 <= 200.0
        {
            pre -= 1;
        }
        // Name heading: the words just left of those, close together.
        let mut first = pre;
        while first > 0 {
            let prev = &line[first - 1];
            let gap = line[first].x0 - prev.x1;
            let limit = if first == pre { 200.0 } else { 20.0 };
            // Nor from the other half of a two-column page.
            let crosses = prev.x1 < mid && line[pre].x0 > mid;
            if gap > limit || is_heading(&prev.text) || crosses {
                break;
            }
            first -= 1;
        }
        let nameless = first == pre;
        if nameless && pre != tl_index {
            continue;
        }
        let name_words = &line[first..pre];
        let mut columns = vec![if nameless {
            Column {
                label: String::new(),
                x0: f64::NEG_INFINITY,
            }
        } else {
            Column {
                label: name_words
                    .iter()
                    .map(|w| w.text.as_str())
                    .collect::<Vec<_>>()
                    .join(" "),
                x0: name_words[0].x0,
            }
        }];
        columns.extend(line[pre..tl_index].iter().map(|w| Column {
            label: w.text.to_uppercase(),
            x0: w.x0,
        }));

        let last_x1 = headings_from(&line[tl_index..], mid, &mut columns);

        let has_cost = columns
            .iter()
            .any(|c| matches!(c.label.as_str(), "COST" | "KG" | "MASS"));
        if !has_cost {
            continue;
        }
        let left = if nameless { tl.x0 } else { columns[0].x0 } - 4.0;
        let (left, right) = if last_x1 < mid + 10.0 {
            (left, mid)
        } else if left > mid - 10.0 {
            (left.max(mid - 10.0), page_width)
        } else {
            (left, page_width)
        };
        found.push(Header {
            columns,
            left,
            right,
            y: tl.mid_y(),
            nameless,
        });
    }
    found
}

/// The headings from TL rightwards, joining two-word ones, pushed onto
/// `columns`. Returns where the last one ends.
fn headings_from(words: &[Word], mid: f64, columns: &mut Vec<Column>) -> f64 {
    let tl_x0 = words[0].x0;
    let mut i = 0;
    let mut last_x1 = tl_x0;
    while i < words.len() {
        let w = &words[i];
        // Wide gaps happen ("FEATURES … COST"), but a heading far across
        // the page midline belongs to the other column's table.
        let gap = w.x0 - last_x1;
        let crosses = tl_x0 < mid && last_x1 < mid && w.x0 > mid;
        if gap > 200.0 || (crosses && gap > 90.0) {
            break;
        }
        if let Some(n) = words.get(i + 1) {
            if PAIRS
                .iter()
                .any(|(a, b)| w.text.eq_ignore_ascii_case(a) && n.text.eq_ignore_ascii_case(b))
                && n.x0 - w.x1 < 12.0
            {
                columns.push(Column {
                    label: format!("{} {}", w.text, n.text).to_uppercase(),
                    x0: w.x0,
                });
                last_x1 = n.x1;
                i += 2;
                continue;
            }
        }
        if !is_heading(&w.text) {
            break;
        }
        columns.push(Column {
            label: w.text.to_uppercase(),
            x0: w.x0,
        });
        last_x1 = w.x1;
        i += 1;
    }
    last_x1
}

/// Which column a word belongs to: the last one starting at or just
/// before it (numbers are sometimes centred under their heading).
fn column_of(columns: &[Column], word: &Word) -> usize {
    columns
        .iter()
        .rposition(|c| c.x0 <= word.x0 + 6.0)
        .unwrap_or(0)
}

/// Reads the rows of one table below its header.
fn read_rows(header: &Header, below: &[Vec<Word>]) -> Vec<Vec<String>> {
    let cols = header.columns.len();
    let tl_col = header
        .columns
        .iter()
        .position(|c| c.label == "TL")
        .unwrap_or(1);
    let mut rows: Vec<Vec<String>> = Vec::new();
    let mut last_y = header.y;
    // Where the last row with its own name began.
    let mut named_row_above: Option<f64> = None;

    for line in below {
        let words: Vec<&Word> = line
            .iter()
            .filter(|w| w.x0 >= header.left - 1.0 && w.x0 < header.right)
            .collect();
        if words.is_empty() {
            continue;
        }
        let y = words[0].mid_y();
        if y - last_y > 26.0 {
            break; // the table has ended
        }
        // Another table's header ends this one.
        if words.iter().any(|w| w.text.eq_ignore_ascii_case("TL"))
            && words
                .iter()
                .any(|w| matches!(w.text.to_uppercase().as_str(), "COST" | "KG" | "MASS"))
        {
            break;
        }

        let mut cells: Vec<Vec<&str>> = vec![Vec::new(); cols];
        for w in &words {
            cells[column_of(&header.columns, w)].push(&w.text);
        }
        // A TL is a number ("8", "7+", "10–12"), or a dash on a row that
        // fills the other columns ("Improvised"); prose landing there isn't.
        let filled = cells.iter().filter(|c| !c.is_empty()).count();
        let has_tl = cells[tl_col].first().is_some_and(|t| {
            let t = t.strip_prefix("TL").unwrap_or(t); // "TL5" in TL-first tables
            t.starts_with(|c: char| c.is_ascii_digit())
                || (is_dash(t) && cells[tl_col].len() == 1 && filled >= 4)
        });

        // An indented all-caps line inside a table is a sub-heading
        // ("PISTOLS", "RIFLES"): skip it.
        let indented = words[0].x0 > header.columns[0].x0 + 8.0;
        if !has_tl && indented && !cells[0].is_empty() && cells[0].iter().all(|w| is_caps(w)) {
            last_y = y;
            continue;
        }

        // An all-caps box heading ("LIFE-SUPPORT", "RAD BLANKET") starts the
        // next item's description: keep what's before it, then stop.
        let heading_at = heading_start(&cells[0]);
        let ends_here = match heading_at {
            Some(0) if !has_tl => break,
            Some(0) | None => false,
            Some(i) => {
                cells[0].truncate(i);
                true
            }
        };
        // So does a footnote.
        if !has_tl && cells[0].first().is_some_and(|w| w.starts_with('*')) {
            break;
        }

        let has_name = !cells[0].is_empty();
        // Prose runs across the columns without a TL; stop there. It starts
        // in the name column, or in TL's when the table starts with TL.
        let lead = if header.nameless { tl_col } else { 0 };
        let filled_later = cells[lead + 1..].iter().filter(|c| !c.is_empty()).count();
        if !has_tl && !cells[lead].is_empty() && (filled_later >= 2 || cells[lead].len() > 6) {
            break;
        }

        let joined: Vec<String> = cells.iter().map(|c| c.join(" ")).collect();
        if has_tl {
            let mut row = joined;
            // A name already used by an earlier item, right under a row
            // that has its own name, is the second line of that name with
            // another TL ("Hostile Environment" / "Vacc Suit").
            let wrapped = has_name
                && named_row_above.is_some_and(|row_y| y - row_y <= 14.0)
                && rows.len() >= 2
                && rows[..rows.len() - 1].iter().any(|r| r[0] == row[0]);
            if wrapped {
                let prev = rows.last_mut().expect("checked above");
                prev[0] = format!("{} {}", prev[0], row[0]);
                row[0].clone_from(&prev[0]);
                named_row_above = None;
            } else if has_name {
                named_row_above = Some(y);
            } else {
                // A variant (e.g. another TL) of the item above.
                if let Some(prev) = rows.last() {
                    row[0].clone_from(&prev[0]);
                }
                named_row_above = None;
            }
            rows.push(row);
        } else if let Some(prev) = rows.last_mut() {
            // Continues the row above: a wrapped name, trait or effect.
            for (cell, more) in prev.iter_mut().zip(joined) {
                if !more.is_empty() {
                    if !cell.is_empty() {
                        cell.push(' ');
                    }
                    cell.push_str(&more);
                }
            }
        } else {
            continue; // stray text before the first row
        }
        if ends_here {
            break;
        }
        last_y = y;
    }
    rows
}

/// Where an all-caps heading starts among a name cell's words: a caps word
/// of four or more letters, or two caps words together. A lone short one
/// ("HUD", "TDX") is part of the name.
fn heading_start(name: &[&str]) -> Option<usize> {
    let letters = |w: &str| w.chars().filter(char::is_ascii_alphabetic).count();
    (0..name.len()).find(|&i| {
        is_caps(name[i]) && (letters(name[i]) >= 4 || name.get(i + 1).is_some_and(|n| is_caps(n)))
    })
}

fn is_dash(text: &str) -> bool {
    matches!(text, "—" | "–" | "-")
}

/// An all-caps word like "LIFE-SUPPORT" (a box heading), not "Cr10" or "+2".
fn is_caps(word: &str) -> bool {
    word.chars().filter(char::is_ascii_alphabetic).count() >= 2
        && !word.chars().any(char::is_lowercase)
}

/// A short title on the line just above a header, starting where the name
/// heading does: "Gyro-stabiliser" above "Rig  TL  Effect …". `above` is
/// every line above the header, nearest last; lines from the page's other
/// column are skipped.
fn title_above(header: &Header, above: &[Vec<Word>]) -> Option<String> {
    let name_x = header.columns[0].x0;
    let words: Vec<&Word> = above
        .iter()
        .rev()
        .map(|line| {
            line.iter()
                .filter(|w| w.x0 >= header.left - 1.0 && w.x0 < header.right)
                .collect::<Vec<_>>()
        })
        .find(|words| !words.is_empty())?;
    let first = words.first()?;
    let next_col = header.columns.get(1).map_or(header.right, |c| c.x0);
    let fits = (first.x0 - name_x).abs() < 4.0
        && header.y - first.mid_y() < 16.0
        && words.len() <= 4
        && words.iter().all(|w| w.x1 < next_col);
    fits.then(|| {
        words
            .iter()
            .map(|w| w.text.as_str())
            .collect::<Vec<_>>()
            .join(" ")
    })
}

/// For a table that starts with TL: the item it's about, from the nearest
/// paragraph above in the same column that opens with "Name:" ("Mobile
/// Comm: A mobile comm unit is…").
fn paragraph_name(header: &Header, above: &[Vec<Word>]) -> Option<String> {
    let x = header.left + 4.0;
    above.iter().rev().find_map(|line| {
        let words: Vec<&Word> = line
            .iter()
            .filter(|w| w.x0 >= header.left - 1.0 && w.x0 < header.right)
            .collect();
        if words.first().is_none_or(|w| (w.x0 - x).abs() > 6.0) {
            return None;
        }
        let end = words.iter().take(4).position(|w| w.text.ends_with(':'))?;
        let name: Vec<&str> = words[..=end].iter().map(|w| w.text.as_str()).collect();
        Some(name.join(" ").trim_end_matches(':').to_string())
    })
}

/// Every equipment table on a page.
pub fn find_tables(page: u32, page_width: f64, words: &[Word]) -> Vec<RawTable> {
    // Rotated text (the chapter tab down the page edge) isn't part of any
    // table.
    let upright: Vec<Word> = words
        .iter()
        .filter(|w| w.y1 - w.y0 <= 2.0 * (w.x1 - w.x0).max(12.0))
        .cloned()
        .collect();
    let all = lines(&upright, 3.0);
    let mut tables = Vec::new();
    for (i, line) in all.iter().enumerate() {
        for mut header in headers_on(line, page_width) {
            if header.nameless {
                let Some(name) = paragraph_name(&header, &all[..i]) else {
                    continue;
                };
                header.columns[0].label = name;
            } else if let Some(title) =
                // Not an all-caps section heading ("MELEE WEAPONS").
                title_above(&header, &all[..i])
                    .filter(|t| t.chars().any(char::is_lowercase))
            {
                let label = &mut header.columns[0].label;
                *label = format!("{title} {label}");
            }
            let rows = read_rows(&header, &all[i + 1..]);
            if !rows.is_empty() {
                tables.push(RawTable {
                    page,
                    columns: header.columns,
                    rows,
                });
            }
        }
    }
    tables
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::words::word;

    /// Lays out a row of cells at the given column positions.
    fn row(y: f64, cells: &[(f64, &str)]) -> Vec<Word> {
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

    const COLS: [f64; 7] = [40.0, 150.0, 180.0, 230.0, 280.0, 320.0, 380.0];

    fn weapon_table(rows: &[[&str; 7]], start_y: f64) -> Vec<Word> {
        let mut words = row(
            start_y,
            &COLS
                .iter()
                .copied()
                .zip(["WEAPON", "TL", "RANGE", "DAMAGE", "KG", "COST", "TRAITS"])
                .collect::<Vec<_>>(),
        );
        for (i, r) in rows.iter().enumerate() {
            #[allow(clippy::cast_precision_loss)]
            let y = start_y + 14.0 * (i as f64 + 1.0);
            let cells: Vec<(f64, &str)> = COLS
                .iter()
                .copied()
                .zip(r.iter().copied())
                .filter(|(_, t)| !t.is_empty())
                .collect();
            words.extend(row(y, &cells));
        }
        words
    }

    #[test]
    fn reads_a_simple_table() {
        let words = weapon_table(
            &[
                ["Brass Knuckles", "1", "Melee", "1D+2", "—", "Cr10", "—"],
                ["Garrotte", "0", "Melee", "2D", "—", "Cr10", "—"],
            ],
            100.0,
        );
        let tables = find_tables(5, 900.0, &words);
        assert_eq!(tables.len(), 1);
        let t = &tables[0];
        let labels: Vec<&str> = t.columns.iter().map(|c| c.label.as_str()).collect();
        assert_eq!(
            labels,
            ["WEAPON", "TL", "RANGE", "DAMAGE", "KG", "COST", "TRAITS"]
        );
        assert_eq!(
            t.rows[0],
            ["Brass Knuckles", "1", "Melee", "1D+2", "—", "Cr10", "—"]
        );
        assert_eq!(t.rows.len(), 2);
    }

    #[test]
    fn variants_wrapped_names_and_wrapped_traits() {
        let words = weapon_table(
            &[
                [
                    "Accelerator Rifle",
                    "9",
                    "250",
                    "3D",
                    "2",
                    "Cr900",
                    "Zero-G",
                ],
                ["", "11", "400", "3D", "2", "Cr1500", "Zero-G"],
                [
                    "Advanced Combat",
                    "10",
                    "450",
                    "3D",
                    "3",
                    "Cr1000",
                    "Auto 3,",
                ],
                ["Rifle", "", "", "", "", "", "Scope"],
            ],
            100.0,
        );
        let t = &find_tables(5, 900.0, &words)[0];
        assert_eq!(t.rows.len(), 3);
        assert_eq!(t.rows[1][0], "Accelerator Rifle", "variant keeps the name");
        assert_eq!(t.rows[1][1], "11");
        assert_eq!(t.rows[2][0], "Advanced Combat Rifle");
        assert_eq!(t.rows[2][6], "Auto 3, Scope");
    }

    #[test]
    fn stops_at_prose_and_at_gaps() {
        let mut words = weapon_table(&[["Garrotte", "0", "Melee", "2D", "—", "Cr10", "—"]], 100.0);
        // Prose across the columns right after the table.
        words.extend(row(
            128.0,
            &[
                (40.0, "This weapon is"),
                (180.0, "very old and"),
                (280.0, "rarely seen"),
            ],
        ));
        let t = &find_tables(5, 900.0, &words)[0];
        assert_eq!(t.rows.len(), 1);

        let mut words = weapon_table(&[["Garrotte", "0", "Melee", "2D", "—", "Cr10", "—"]], 100.0);
        words.extend(row(300.0, &[(40.0, "Club"), (150.0, "1"), (320.0, "Cr5")]));
        assert_eq!(
            find_tables(5, 900.0, &words)[0].rows.len(),
            1,
            "far below: not part of it"
        );
    }

    #[test]
    fn keeps_two_column_tables_apart() {
        // A small table in the left half; prose in the right half.
        let mut words = row(
            100.0,
            &[
                (40.0, "Filter Mask"),
                (120.0, "TL"),
                (140.0, "Effect"),
                (220.0, "Kg"),
                (250.0, "Cost"),
            ],
        );
        words.extend(row(100.0, &[(320.0, "A filter set that allows breathing")]));
        words.extend(row(
            114.0,
            &[
                (40.0, "Basic"),
                (120.0, "3"),
                (140.0, "Protection"),
                (220.0, "—"),
                (250.0, "Cr10"),
            ],
        ));
        words.extend(row(114.0, &[(320.0, "of tainted atmospheres and")]));
        let tables = find_tables(7, 612.0, &words);
        assert_eq!(tables.len(), 1);
        let t = &tables[0];
        assert_eq!(t.columns[0].label, "Filter Mask");
        assert_eq!(t.rows[0], ["Basic", "3", "Protection", "—", "Cr10"]);
    }

    #[test]
    fn joins_two_word_headings() {
        let line = row(
            100.0,
            &[
                (40.0, "WEAPON"),
                (150.0, "TL"),
                (180.0, "COST"),
                (230.0, "MAGAZINE COST"),
                (330.0, "TRAITS"),
            ],
        );
        let h = &headers_on(&line, 900.0)[0];
        let labels: Vec<&str> = h.columns.iter().map(|c| c.label.as_str()).collect();
        assert_eq!(labels, ["WEAPON", "TL", "COST", "MAGAZINE COST", "TRAITS"]);
    }

    #[test]
    fn tables_that_start_with_tl_take_the_paragraph_name() {
        let mut words = row(60.0, &[(40.0, "Mobile Comm: A portable comm unit.")]);
        words.extend(row(74.0, &[(40.0, "Some more about it.")]));
        words.extend(row(
            100.0,
            &[(40.0, "TL"), (70.0, "FEATURES"), (220.0, "COST")],
        ));
        words.extend(row(
            114.0,
            &[(40.0, "TL6"), (70.0, "Audio only"), (220.0, "Cr50")],
        ));
        words.extend(row(
            128.0,
            &[(40.0, "TL8"), (70.0, "Audio and visual,"), (220.0, "Cr150")],
        ));
        words.extend(row(142.0, &[(70.0, "Computer/0")]));
        words.extend(row(
            156.0,
            &[(40.0, "Audio: The bug records"), (220.0, "anything")],
        ));
        let t = &find_tables(5, 900.0, &words)[0];
        assert_eq!(t.columns[0].label, "Mobile Comm");
        assert_eq!(t.rows.len(), 2);
        assert_eq!(
            t.rows[1],
            ["", "TL8", "Audio and visual, Computer/0", "Cr150"]
        );
    }

    #[test]
    fn a_name_wrapped_onto_a_variant_row() {
        let words = weapon_table(
            &[
                ["Vacc Suit", "8", "", "", "28", "Cr12000", ""],
                ["Hostile Environment", "9", "", "", "40", "Cr24000", ""],
                ["Vacc Suit", "10", "", "", "30", "Cr20000", ""],
                ["", "13", "", "", "20", "Cr40000", ""],
            ],
            100.0,
        );
        let t = &find_tables(5, 900.0, &words)[0];
        let names: Vec<&str> = t.rows.iter().map(|r| r[0].as_str()).collect();
        assert_eq!(
            names,
            [
                "Vacc Suit",
                "Hostile Environment Vacc Suit",
                "Hostile Environment Vacc Suit",
                "Hostile Environment Vacc Suit"
            ]
        );
    }

    #[test]
    fn sub_headings_and_dash_tls() {
        let mut words = weapon_table(&[["Blade", "2", "Melee", "2D", "1", "Cr100", "—"]], 100.0);
        // An indented sub-heading, then a row whose TL is a dash.
        words.extend(row(128.0, &[(52.0, "PISTOLS")]));
        words.extend(row(
            142.0,
            &[
                (40.0, "Improvised"),
                (150.0, "—"),
                (180.0, "Melee"),
                (230.0, "2D"),
                (320.0, "—"),
            ],
        ));
        let t = &find_tables(5, 900.0, &words)[0];
        assert_eq!(t.rows.len(), 2);
        assert_eq!(t.rows[1][0], "Improvised");
    }

    #[test]
    fn finds_box_headings_in_names() {
        assert_eq!(heading_start(&["Database", "DECRYPTOR"]), Some(1));
        assert_eq!(
            heading_start(&["(10", "pack)", "RAD", "BLANKET", "This"]),
            Some(2)
        );
        assert_eq!(heading_start(&["Friend", "or", "Foe", "HUD"]), None);
        assert_eq!(heading_start(&["APDS"]), Some(0), "a whole caps name");
        assert_eq!(heading_start(&["Physical", "Augmentation", "+2"]), None);
    }

    #[test]
    fn headings_before_tl() {
        let mut words = row(
            100.0,
            &[
                (40.0, "ARMOUR TYPE"),
                (150.0, "PROTECTION"),
                (230.0, "TL"),
                (260.0, "RAD"),
                (300.0, "KG"),
                (330.0, "COST"),
                (390.0, "REQUIRED SKILL"),
            ],
        );
        words.extend(row(
            114.0,
            &[
                (40.0, "Vacc Suit"),
                (150.0, "+8"),
                (230.0, "10"),
                (260.0, "60"),
                (300.0, "17"),
                (330.0, "Cr10000"),
                (390.0, "Vacc Suit 0"),
            ],
        ));
        let t = &find_tables(5, 900.0, &words)[0];
        let labels: Vec<&str> = t.columns.iter().map(|c| c.label.as_str()).collect();
        assert_eq!(
            labels,
            [
                "ARMOUR TYPE",
                "PROTECTION",
                "TL",
                "RAD",
                "KG",
                "COST",
                "REQUIRED SKILL"
            ]
        );
        assert_eq!(t.rows[0][1], "+8");
        assert_eq!(t.rows[0][2], "10");
    }
}
