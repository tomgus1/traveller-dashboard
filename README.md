# Traveller Campaign Dashboard (React + TypeScript + Vite)

A lightweight, browser-based dashboard for a **Mongoose Traveller 2e** campaign.  
Track **party & ship finances**, **cargo legs**, and per-character **ledger / inventory / ammunition**.  
Works offline (localStorage) and can **import/export** your LibreOffice/Excel workbook.

---

## Features

- **Party**: income/expenses with running totals.
- **Ship**: fuel, docking, maintenance and other accounts.
- **Cargo**: record speculative trade legs and profit per ton.
- **Characters**: per-PC ledger, inventory totals, ammunition totals.
- **Import/Export XLSX**: round-trip with your spreadsheet (Microsoft Office, Google Sheets, LibreOffice Calc).
- **KISS/DRY**: small reusable components; no heavy state library.

---

## Quick start

```bash
# Create the project (if not already)
npm create vite@latest traveller-dashboard -- --template react-swc-ts
cd traveller-dashboard

# Dependencies
npm i xlsx lucide-react
npm i -D tailwindcss postcss autoprefixer gh-pages
npx tailwindcss init -p

# Add/replace the project files from this repo, then:
npm run dev
```

Open <http://localhost:5173>

---

## Tailwind setup (v3)

This project uses **Tailwind v3** for maximum compatibility.

**postcss.config.js**

```js
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

**tailwind.config.js**

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: { extend: {} },
  plugins: [],
};
```

**src/index.css**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

/* Small app styles */
:root {
  color-scheme: light dark;
}
body {
  @apply bg-white text-gray-900 dark:bg-zinc-950 dark:text-zinc-50;
}
.card {
  @apply rounded-2xl border p-4 shadow-sm bg-white/60 dark:bg-zinc-900/60;
}
.btn {
  @apply inline-flex items-center gap-2 rounded-2xl px-3 py-2 border;
}
.input,
.select {
  @apply rounded-xl border px-3 py-2 bg-transparent;
}
.table {
  @apply w-full text-sm;
}
.table th {
  @apply text-left px-3 py-2 font-medium bg-zinc-100 dark:bg-zinc-900/50;
}
.table td {
  @apply px-3 py-2 border-t;
}
```

> Prefer Tailwind v4? Install `@tailwindcss/postcss` and use `@import "tailwindcss";` in `index.css`.

---

## Scripts

```bash
npm run dev      # start Vite dev server
npm run build    # type-check & build to dist/
npm run preview  # preview the production build locally
npm run deploy   # build and publish dist/ to the gh-pages branch
```

Ensure `package.json` includes:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview --port 5173",
    "deploy": "vite build && gh-pages -d dist"
  }
}
```

---

## Vite config for GitHub Pages

Set your repository name as the base:

**vite.config.ts**

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "/traveller-dashboard/", // <-- replace with your repo name
});
```

---

## Project structure (abridged)

```
src/
  components/           # shared UI
    SectionCard.tsx
    Table.tsx
    MoneyInput.tsx
    Tabs.tsx
  features/
    party/PartyFinances.tsx
    ship/ShipAccounts.tsx
    cargo/Cargo.tsx
    pcs/
      Characters.tsx
      Inventory.tsx
      Ammo.tsx
  lib/xlsx.ts           # import/export helpers
  utils/                # numbers, storage
  constants.ts          # PC names
  types.ts
  App.tsx
  main.tsx
  index.css
```

---

## How to use

1. **Party** tab  
   Add Income (positive) and Expenses (negative). The card shows current Party Fund.

2. **Ship** tab  
   Log fuel, docking, maintenance. The card shows Ship Fund.

3. **Cargo** tab  
   Add a leg when you **buy** cargo; later add a row with the **sale** price to compute profit (Cr).

4. **Characters** tab  
   Choose a PC from the drop-down.
   - **Ledger**: credit/debit entries.
   - **Inventory**: item, quantity, mass, value with totals.
   - **Ammo**: weapon, magazine size, loaded, spares, loose; auto total rounds.

5. **Import / Export XLSX**
   - **Export** creates an `.xlsx` with sheets: `Party_Finances`, `Ship_Accounts`, `Ship_Cargo`, plus per-PC sheets.
   - **Import** reads the same sheets back into the app.
   - **Universal compatibility**: Works with Microsoft Office, Google Sheets, and LibreOffice Calc.
   - **Data optimization**: Handles null values and data types for maximum compatibility.
   - Keep your LibreOffice workbook closed while importing to avoid locks.

Data also persists in your browser (localStorage).

---

## Deploy to GitHub Pages

```bash
# build & publish to gh-pages branch
npm run deploy
```

Then on GitHub → **Settings → Pages**:  
Source: **Deploy from a branch** → Branch: `gh-pages` → `/ (root)`.

Your site will be available at:

```
https://<your-username>.github.io/<repo-name>/
```

### Optional: auto-deploy on push (GitHub Actions)

Create `.github/workflows/gh-pages.yml`:

```yaml
name: Deploy to Pages
on:
  push: { branches: [main] }
permissions: { contents: write }
jobs:
  build-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: "20" }
      - run: npm ci
      - run: npm run build
      - uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: dist
```

---

## Troubleshooting

- **Black screen**: open DevTools Console.  
  Most common: a component uses `useState` without `import { useState } from 'react'`.
- **Tailwind PostCSS error**: ensure Tailwind v3 config (above), or use v4 with `@tailwindcss/postcss`.
- **Blank page on Pages**: `vite.config.ts` must set `base` to `'/<repo>/'`.
- **Import fails**: sheet names must match (`Party_Finances`, `Ship_Accounts`, `Ship_Cargo`, etc.).
- **Totals look wrong**: Expenses should be negative, Income positive.
- **LibreOffice Calc issues**: Export is optimized for universal compatibility. If you still encounter issues, try:
  - Closing LibreOffice completely before importing the file
  - Opening the file directly from LibreOffice instead of double-clicking
  - Using "Open" menu in LibreOffice and selecting "Microsoft Excel" format explicitly

---

## Licence

MIT — attribution appreciated.  
Traveller is © Far Future Enterprises / Mongoose Publishing; this project contains no proprietary rules text.
