# Linting and Formatting

Linting uses [oxlint](https://oxc.rs/docs/guide/usage/linter) and formatting uses
[oxfmt](https://oxc.rs/docs/guide/usage/formatter), both from the Oxc toolchain.
Both run in milliseconds on the whole repo.

- Lint config: [`.oxlintrc.json`](.oxlintrc.json)
- Format config: [`.oxfmtrc.json`](.oxfmtrc.json) (Prettier-compatible options)

## Scripts

```bash
pnpm lint            # Lint, 0 warnings allowed
pnpm lint:check      # Lint, up to 5 warnings allowed (used by `pnpm build`)
pnpm lint:fix        # Apply safe auto-fixes
pnpm format          # Format all files
pnpm format:check    # Check formatting without writing
pnpm type-check      # tsc, no emit
pnpm build           # lint:check → type-check → tests → vite build
```

## Rules

`correctness` is enabled as errors (code that is almost certainly wrong). On top of that:

**TypeScript**: `no-explicit-any` and `consistent-type-imports` are errors.
`no-non-null-assertion` and `ban-ts-comment` are warnings.

**React**: `rules-of-hooks` is an error. `exhaustive-deps` and `only-export-components`
are warnings. The React Compiler rules (`purity`, `refs`, `immutability`, …) are enabled.
`set-state-in-effect` and `preserve-manual-memoization` are currently off because
existing code violates them. See the TODO below.

**General**: `eqeqeq`, `prefer-const`, `prefer-template`, `no-var`, `no-eval`, and
others are errors. `no-console` and `no-alert` are warnings.

**Complexity** (warnings): cyclomatic complexity 20, nesting depth 4,
500 lines per function, 5 parameters.

Test files (`__tests__/`, `*.test.*`) allow `any`, `console`, and long functions.

Suppression comments use the ESLint syntax, which oxlint understands:
`// eslint-disable-next-line no-console` (or `// oxlint-disable-next-line ...`).

## Editor setup (VS Code)

Install the **Oxc** extension (`oxc.oxc-vscode`) for inline lint errors and
format-on-save. Remove or disable the ESLint and Prettier extensions for this
workspace.

```jsonc
// .vscode/settings.json
{
  "editor.defaultFormatter": "oxc.oxc-vscode",
  "editor.formatOnSave": true,
}
```

## TODO

- Fix the 4 places that violate `react/set-state-in-effect` /
  `react/preserve-manual-memoization` (run `pnpm exec oxlint -A all -D react/set-state-in-effect -D react/preserve-manual-memoization`
  to list them), then turn the rules back on.
- Run `pnpm format` once as a standalone commit. About 78 files predate the
  formatter being enforced.
