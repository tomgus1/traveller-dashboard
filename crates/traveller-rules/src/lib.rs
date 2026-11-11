//! Mongoose Traveller (2nd edition) rules as pure, tested functions.
//!
//! # Fidelity
//!
//! Every rule cites where it comes from, as `Core p.N`: the printed page of
//! the *Traveller Core Rulebook, Update 2022*. Tests reproduce the book's own
//! worked examples where it gives them. This crate contains our code only,
//! never the book's text or tables.
//!
//! # Design
//!
//! Functions take dice results as inputs instead of rolling them, so every
//! rule is deterministic and testable. [`dice::Dice`] supplies real rolls
//! when the app needs them.

pub mod characteristics;
pub mod combat;
pub mod credits;
pub mod dice;
pub mod healing;
pub mod ship;
pub mod tasks;

pub use characteristics::{Characteristic, dm};
pub use credits::Credits;
pub use tasks::{Difficulty, Outcome, TaskResult};
