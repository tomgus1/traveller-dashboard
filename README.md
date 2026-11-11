# Traveller Dashboard

A companion app for **Mongoose Traveller 2nd edition** groups: character
sheets, campaigns and the shared records a party keeps (ship, funds, cargo,
trade, travel log), in one place that works on phones at the table and
laptops at home.

Written in **Rust**, compiled to **WebAssembly** with
[Dioxus](https://dioxuslabs.com/), backed by [Supabase](https://supabase.com/).
It's styled after the rulebooks: light like the inside pages, dark like the
covers, following the device's theme.

## What it does

- **Characters:** a full sheet across five tabs (Overview, Equipment,
  Finances, History & people, Notes). Players manage their own; the
  campaign's referee can read them.
- **At the table:** take damage and heal (applied by the rules), fire and
  reload, spend and receive credits.
- **Campaigns:** members and roles (referee, player, admin), invitations by
  email, and the party roster with everyone's condition.
- **Shared campaign records,** editable by every member: party funds and the
  ship fund with ledgers, the ship's locker, ship details and running costs,
  cargo, contracts, trades, the Imperial date, jumps, worlds, missions and a
  journal. Simultaneous edits all land.
- **Referee notes** that only referees can see.

Rules follow the Core Rulebook (Update 2022): every rule in
`crates/traveller-rules` cites its page, and its tests use the book's own
worked examples.

## Layout

| Path | What's there |
| --- | --- |
| `crates/traveller-rules` | Game rules as pure functions, with page references |
| `crates/traveller-model` | What's stored (character sheet, campaign state), as Rust types |
| `crates/app` | The Dioxus web app |
| `database/` | SQL migrations, applied in order, and `tests/run.sh` |
| `supabase/functions` | Edge Functions (Deno), e.g. `invite-user` |
| `scripts/dev.sh` | Runs the app locally |

## Running it locally

You need [rustup](https://rustup.rs/); `rust-toolchain.toml` pins the
version and adds the WebAssembly target. Then install the Dioxus CLI, `dx`,
version 0.7.10 (for example from its
[release page](https://github.com/DioxusLabs/dioxus/releases/tag/v0.7.10), or
`cargo binstall dioxus-cli@0.7.10`).

Put your Supabase project's URL and anon key in `.env.local` (see
`.env.example`), then:

```sh
scripts/dev.sh            # http://localhost:8080/traveller-dashboard/
```

Edits to the code or styles reload automatically. To invite people while
running locally, add `http://localhost:8080` to the `EXTRA_ALLOWED_ORIGINS`
secret of the `invite-user` Edge Function.

## Checks

```sh
cargo fmt --all --check
cargo clippy --workspace --all-targets -- -D warnings
cargo clippy -p app --target wasm32-unknown-unknown --all-targets -- -D warnings
cargo test --workspace
database/tests/run.sh     # migrations and access rules, in a throwaway Postgres (Podman or Docker)
```

CI runs all of these on every push, plus the Edge Function checks. Pushes to
`main` then build the app and deploy it to GitHub Pages, and deploy the Edge
Functions.

## Database

Apply the files in `database/` in order in the Supabase SQL editor; each is
safe to run more than once. Row Level Security decides who sees what: the
app only hides controls the database would refuse anyway.
`database/tests/run.sh` tests each migration against a copy of the schema,
including how the live database differs from the earliest files.

Email invitations use Brevo when configured; see [EMAIL_SETUP.md](./EMAIL_SETUP.md).
Without it, invitations still appear on the invitee's Home page.

## Rulebook content

The app implements the game's rules in its own code and doesn't include text
or tables from the books. Equipment stats from the Core Rulebook and Central
Supply Catalogue are kept out of this public repository.

Traveller is a trademark of Far Future Enterprises, and Mongoose Traveller
is published by Mongoose Publishing. This is an unofficial fan project, not
affiliated with or endorsed by either.

## Licence

GPL-3.0-or-later (see `LICENSE`). The bundled fonts, Barlow Condensed and
Arimo, are under the SIL Open Font License; their licences are in
`crates/app/public/fonts`.
