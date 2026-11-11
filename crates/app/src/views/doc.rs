//! Editing a JSON document (a character sheet or a campaign's state) as a
//! series of operations.
//!
//! An operation says *what* to change ("add this trade", "update item X",
//! "add Cr500 to the balance"), not the whole new document. Applying one
//! twice gives the same result, and it still makes sense on top of someone
//! else's newer save, so a clashing save can be replayed instead of lost.

use dioxus::prelude::*;
use serde_json::{Map, Value};

/// Which list item an operation is about.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum Target {
    /// A new item with this id (empty for lists without ids).
    New(String),
    /// By position, for lists without ids (a character sheet has one
    /// editor, so positions are stable).
    Index(usize),
    /// By id, for shared lists.
    Id(String),
}

/// One change to a document.
#[derive(Debug, Clone, PartialEq)]
pub enum DocChange {
    /// Add an item, or overwrite fields of an existing one.
    Upsert {
        path: &'static str,
        target: Target,
        fields: Map<String, Value>,
    },
    /// Remove an item.
    Remove { path: &'static str, target: Target },
    /// Overwrite fields of the object at `path` ("" is the top level).
    Set {
        path: &'static str,
        fields: Map<String, Value>,
    },
    /// Add `by` to the number at `path` (e.g. a balance).
    Increment { path: &'static str, by: i64 },
    /// Several changes together.
    Batch(Vec<DocChange>),
}

/// The value at a dotted path ("" is the root).
pub fn at<'a>(root: &'a Value, path: &str) -> Option<&'a Value> {
    if path.is_empty() {
        return Some(root);
    }
    path.split('.').try_fold(root, |v, key| v.get(key))
}

/// The value at a dotted path, creating objects on the way and `default`
/// at the end when missing.
pub fn at_mut<'a>(root: &'a mut Value, path: &str, default: &Value) -> &'a mut Value {
    if path.is_empty() {
        return root;
    }
    let mut keys = path.split('.').peekable();
    let mut v = root;
    while let Some(key) = keys.next() {
        if !v.is_object() {
            *v = Value::Object(Map::new());
        }
        let fill = if keys.peek().is_some() {
            Value::Object(Map::new())
        } else {
            default.clone()
        };
        v = v
            .as_object_mut()
            .expect("just made an object")
            .entry(key)
            .or_insert(fill);
    }
    v
}

fn list<'a>(root: &'a mut Value, path: &str) -> &'a mut Vec<Value> {
    let v = at_mut(root, path, &Value::Array(Vec::new()));
    if !v.is_array() {
        *v = Value::Array(Vec::new());
    }
    v.as_array_mut().expect("just made an array")
}

fn find(items: &[Value], target: &Target) -> Option<usize> {
    match target {
        Target::Index(i) => (*i < items.len()).then_some(*i),
        Target::Id(id) | Target::New(id) if !id.is_empty() => items
            .iter()
            .position(|item| item.get("id").and_then(Value::as_str) == Some(id)),
        _ => None,
    }
}

fn merge(item: &mut Value, fields: &Map<String, Value>) {
    if !item.is_object() {
        *item = Value::Object(Map::new());
    }
    let object = item.as_object_mut().expect("object");
    for (k, v) in fields {
        object.insert(k.clone(), v.clone());
    }
}

impl DocChange {
    /// Applies the change to a document. Changes to items that no longer
    /// exist (removed by someone else) do nothing.
    pub fn apply_to(&self, root: &mut Value) {
        match self {
            Self::Upsert {
                path,
                target,
                fields,
            } => {
                let items = list(root, path);
                if let Some(i) = find(items, target) {
                    merge(&mut items[i], fields);
                } else if let Target::New(id) = target {
                    let mut item = Value::Object(Map::new());
                    merge(&mut item, fields);
                    if !id.is_empty() {
                        merge(
                            &mut item,
                            &Map::from_iter([("id".to_string(), Value::from(id.as_str()))]),
                        );
                    }
                    items.push(item);
                }
            }
            Self::Remove { path, target } => {
                let items = list(root, path);
                if let Some(i) = find(items, target) {
                    items.remove(i);
                }
            }
            Self::Set { path, fields } => {
                let object = at_mut(root, path, &Value::Object(Map::new()));
                merge(object, fields);
            }
            Self::Increment { path, by } => {
                let value = at_mut(root, path, &Value::from(0));
                let now = value.as_i64().unwrap_or(0);
                *value = Value::from(now.saturating_add(*by));
            }
            Self::Batch(changes) => {
                for change in changes {
                    change.apply_to(root);
                }
            }
        }
    }
}

/// A fresh id for a new list item: 16 random hex digits, plenty to never
/// clash within one campaign.
#[allow(clippy::cast_possible_truncation, clippy::cast_sign_loss)] // random() is in [0, 1)
pub fn new_id() -> String {
    let half = || (js_sys::Math::random() * 4_294_967_296.0) as u32;
    format!("{:08x}{:08x}", half(), half())
}

/// The document being edited and how to change it. The character page and
/// the campaign page each provide one; the forms don't care which.
#[derive(Clone, Copy, PartialEq)]
pub struct DocEditor {
    /// The document as JSON.
    pub doc: Memo<Value>,
    /// True while a save is in flight.
    pub saving: Signal<bool>,
    /// Applies a change and saves it, then shows the message.
    pub change: Callback<(DocChange, &'static str)>,
}

/// The editor for the document on this page.
pub fn use_doc() -> DocEditor {
    use_context()
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    fn fields(v: Value) -> Map<String, Value> {
        match v {
            Value::Object(map) => map,
            other => panic!("expected an object, got {other}"),
        }
    }

    #[test]
    fn upsert_new_is_idempotent_with_an_id() {
        let mut doc = json!({});
        let add = DocChange::Upsert {
            path: "trades",
            target: Target::New("t1".into()),
            fields: fields(json!({"goods": "Spices"})),
        };
        add.apply_to(&mut doc);
        add.apply_to(&mut doc); // replayed after a clash
        assert_eq!(doc, json!({"trades": [{"goods": "Spices", "id": "t1"}]}));
    }

    #[test]
    fn edits_by_id_survive_someone_elses_insert() {
        let mut doc = json!({"cargo": [{"id": "a", "tons": 10}, {"id": "b", "tons": 5}]});
        // Someone else added an item at the front meanwhile.
        doc["cargo"]
            .as_array_mut()
            .unwrap()
            .insert(0, json!({"id": "z"}));
        DocChange::Upsert {
            path: "cargo",
            target: Target::Id("b".into()),
            fields: fields(json!({"tons": 6})),
        }
        .apply_to(&mut doc);
        assert_eq!(doc["cargo"][2], json!({"id": "b", "tons": 6}));
    }

    #[test]
    fn edits_to_removed_items_do_nothing() {
        let mut doc = json!({"cargo": [{"id": "a"}]});
        DocChange::Upsert {
            path: "cargo",
            target: Target::Id("gone".into()),
            fields: fields(json!({"tons": 1})),
        }
        .apply_to(&mut doc);
        DocChange::Remove {
            path: "cargo",
            target: Target::Id("gone".into()),
        }
        .apply_to(&mut doc);
        assert_eq!(doc, json!({"cargo": [{"id": "a"}]}));
    }

    #[test]
    fn increments_compose_with_other_peoples_changes() {
        let spend = DocChange::Batch(vec![
            DocChange::Increment {
                path: "funds.balance",
                by: -500,
            },
            DocChange::Upsert {
                path: "funds.ledger",
                target: Target::New("e1".into()),
                fields: fields(json!({"amount": -500})),
            },
        ]);
        // Someone else received Cr1000 first; our spend still lands on top.
        let mut doc = json!({"funds": {"balance": 3000, "ledger": [{"id": "e0", "amount": 1000}]}});
        spend.apply_to(&mut doc);
        assert_eq!(doc["funds"]["balance"], 2500);
        assert_eq!(doc["funds"]["ledger"].as_array().unwrap().len(), 2);
        // Missing balances start from zero.
        let mut empty = json!({});
        spend.apply_to(&mut empty);
        assert_eq!(empty["funds"]["balance"], -500);
    }

    #[test]
    fn set_and_index_targets() {
        let mut doc = json!({"skills": [{"name": "Pilot", "level": 1}]});
        DocChange::Upsert {
            path: "skills",
            target: Target::Index(0),
            fields: fields(json!({"level": 2})),
        }
        .apply_to(&mut doc);
        DocChange::Set {
            path: "identity",
            fields: fields(json!({"homeworld": "Halcyon"})),
        }
        .apply_to(&mut doc);
        DocChange::Upsert {
            path: "skills",
            target: Target::New(String::new()),
            fields: fields(json!({"name": "Vacc Suit", "level": 0})),
        }
        .apply_to(&mut doc);
        assert_eq!(
            doc,
            json!({"skills": [{"name": "Pilot", "level": 2}, {"name": "Vacc Suit", "level": 0}], "identity": {"homeworld": "Halcyon"}})
        );
    }

    #[test]
    fn paths_reach_nested_values() {
        let v = json!({"a": {"b": 1}});
        assert_eq!(at(&v, "a.b"), Some(&json!(1)));
        assert_eq!(at(&v, ""), Some(&v));
        assert_eq!(at(&v, "a.c"), None);
    }
}
