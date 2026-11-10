//! Money, in whole Credits.

use std::fmt;
use std::ops::{Add, Mul, Neg, Sub};

/// An amount in Credits (Cr). Whole credits only: the rules never deal in
/// fractions, and integers keep ledgers exact.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash, Default)]
pub struct Credits(pub i64);

impl Credits {
    /// Zero credits.
    pub const ZERO: Self = Self(0);

    /// From megacredits (millions), e.g. `Credits::mcr(46.332)`. Rounds to the
    /// nearest credit.
    #[allow(clippy::cast_possible_truncation)]
    pub fn mcr(megacredits: f64) -> Self {
        Self((megacredits * 1_000_000.0).round() as i64)
    }

    /// Integer division, rounding up: costs are never under-charged.
    #[must_use]
    pub fn div_ceil(self, divisor: i64) -> Self {
        Self(self.0.div_euclid(divisor) + i64::from(self.0.rem_euclid(divisor) != 0))
    }
}

impl Add for Credits {
    type Output = Self;
    fn add(self, rhs: Self) -> Self {
        Self(self.0 + rhs.0)
    }
}

impl Sub for Credits {
    type Output = Self;
    fn sub(self, rhs: Self) -> Self {
        Self(self.0 - rhs.0)
    }
}

impl Neg for Credits {
    type Output = Self;
    fn neg(self) -> Self {
        Self(-self.0)
    }
}

impl Mul<i64> for Credits {
    type Output = Self;
    fn mul(self, rhs: i64) -> Self {
        Self(self.0 * rhs)
    }
}

impl fmt::Display for Credits {
    /// "Cr12,450", or "−Cr500" for a negative amount.
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        let digits = self.0.unsigned_abs().to_string();
        let mut grouped = String::with_capacity(digits.len() + digits.len() / 3);
        for (i, c) in digits.chars().enumerate() {
            if i > 0 && (digits.len() - i) % 3 == 0 {
                grouped.push(',');
            }
            grouped.push(c);
        }
        let sign = if self.0 < 0 { "\u{2212}" } else { "" };
        write!(f, "{sign}Cr{grouped}")
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn displays_in_setting_style() {
        assert_eq!(Credits(12_450).to_string(), "Cr12,450");
        assert_eq!(Credits(0).to_string(), "Cr0");
        assert_eq!(Credits(-500).to_string(), "\u{2212}Cr500");
        assert_eq!(Credits(46_332_000).to_string(), "Cr46,332,000");
    }

    #[test]
    fn megacredits() {
        assert_eq!(Credits::mcr(46.332), Credits(46_332_000));
        assert_eq!(Credits::mcr(0.05), Credits(50_000));
    }

    #[test]
    fn div_ceil_rounds_up() {
        assert_eq!(Credits(10).div_ceil(3), Credits(4));
        assert_eq!(Credits(9).div_ceil(3), Credits(3));
    }
}
