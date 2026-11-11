//! Words with their positions on the page, from poppler's `pdftotext -tsv`.

use std::path::Path;
use std::process::Command;

/// A word and its box, in PDF points from the top-left.
#[derive(Debug, Clone, PartialEq)]
pub struct Word {
    pub x0: f64,
    pub y0: f64,
    pub x1: f64,
    pub y1: f64,
    pub text: String,
}

impl Word {
    /// Vertical middle, for grouping words into lines.
    pub fn mid_y(&self) -> f64 {
        f64::midpoint(self.y0, self.y1)
    }
}

/// One PDF page's words.
#[derive(Debug, Clone, PartialEq)]
pub struct Page {
    /// PDF page number (1-based).
    pub number: u32,
    pub width: f64,
    pub words: Vec<Word>,
}

/// Reads every page's words from a PDF.
pub fn read_pdf(pdf: &Path) -> Result<Vec<Page>, String> {
    let output = Command::new("pdftotext")
        .arg("-tsv")
        .arg(pdf)
        .arg("-")
        .output()
        .map_err(|e| format!("couldn't run pdftotext (poppler-utils): {e}"))?;
    if !output.status.success() {
        return Err(format!("pdftotext failed on {}", pdf.display()));
    }
    Ok(parse_tsv(&String::from_utf8_lossy(&output.stdout)))
}

/// Parses `pdftotext -tsv` output: level 1 rows are pages, level 5 words.
pub fn parse_tsv(tsv: &str) -> Vec<Page> {
    let mut pages: Vec<Page> = Vec::new();
    for line in tsv.lines().skip(1) {
        let cols: Vec<&str> = line.split('\t').collect();
        if cols.len() < 12 {
            continue;
        }
        let num = |i: usize| cols[i].parse::<f64>().unwrap_or(0.0);
        match cols[0] {
            "1" => pages.push(Page {
                number: cols[1].parse().unwrap_or(0),
                width: num(8),
                words: Vec::new(),
            }),
            "5" => {
                if let Some(page) = pages.last_mut() {
                    let (left, top, width, height) = (num(6), num(7), num(8), num(9));
                    page.words.push(Word {
                        x0: left,
                        y0: top,
                        x1: left + width,
                        y1: top + height,
                        text: cols[11].to_string(),
                    });
                }
            }
            _ => {}
        }
    }
    pages
}

/// Words grouped into visual lines (top to bottom, each left to right).
/// Taking words top to bottom, one within `tolerance` of the previous
/// word's middle joins its line, so a name set a point lower than its row
/// stays with it even when the other page column's text sits in between.
pub fn lines(words: &[Word], tolerance: f64) -> Vec<Vec<Word>> {
    let mut sorted: Vec<Word> = words.to_vec();
    sorted.sort_by(|a, b| a.mid_y().total_cmp(&b.mid_y()));
    let mut out: Vec<Vec<Word>> = Vec::new();
    let mut last_mid = f64::NEG_INFINITY;
    for word in sorted {
        let mid = word.mid_y();
        match out.last_mut() {
            Some(line) if mid - last_mid <= tolerance => line.push(word),
            _ => out.push(vec![word]),
        }
        last_mid = mid;
    }
    for line in &mut out {
        line.sort_by(|a, b| a.x0.total_cmp(&b.x0));
    }
    out
}

#[cfg(test)]
pub fn word(x0: f64, y0: f64, text: &str) -> Word {
    // Test helper: roughly 6pt per character, 10pt tall.
    #[allow(clippy::cast_precision_loss)]
    let width = text.chars().count() as f64 * 6.0;
    Word {
        x0,
        y0,
        x1: x0 + width,
        y1: y0 + 10.0,
        text: text.to_string(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_pages_and_words() {
        let tsv = "level\tpage_num\tpar_num\tblock_num\tline_num\tword_num\tleft\ttop\twidth\theight\tconf\ttext\n\
            1\t3\t0\t0\t0\t0\t0\t0\t612\t792\t-1\t###PAGE###\n\
            4\t3\t0\t0\t0\t0\t50\t100\t40\t12\t-1\t###LINE###\n\
            5\t3\t0\t0\t0\t0\t50.5\t100\t30\t12\t100\tRifle\n";
        let pages = parse_tsv(tsv);
        assert_eq!(pages.len(), 1);
        assert_eq!(pages[0].number, 3);
        assert!((pages[0].width - 612.0).abs() < f64::EPSILON);
        assert_eq!(pages[0].words[0].text, "Rifle");
        assert!((pages[0].words[0].x1 - 80.5).abs() < 1e-9);
    }

    #[test]
    fn groups_words_into_lines() {
        let words = vec![
            word(100.0, 50.0, "b"),
            word(10.0, 51.0, "a"),
            word(10.0, 70.0, "c"),
        ];
        let grouped = lines(&words, 3.0);
        let texts: Vec<Vec<&str>> = grouped
            .iter()
            .map(|l| l.iter().map(|w| w.text.as_str()).collect())
            .collect();
        assert_eq!(texts, vec![vec!["a", "b"], vec!["c"]]);
    }
}
