# Traveller Dashboard

**The Next-Gen Digital Companion for Mongoose Traveller 2E.**

Traveller Dashboard is a high-fidelity, high-performance web application designed to be the ultimate companion for players and GMs. Inspired by modern digital tabletop giants like Demiplane and D&D Beyond, it combines a tactical "Mission Control" aesthetic with powerful administrative tools to streamline campaign management, character tracking, and planetary economics.

---

## 🚀 Vision

- **Immersive HUD**: A "Tactical Terminal" interface that feels like part of your ship's bridge, featuring custom glassmorphism and micro-animations.
- **Unified Dashboards**: Modular "Mission Control" views for Campaign, Ship, and Character data.
- **Cross-Platform**: Optimized for **Laptop, Tablet, and Mobile**—your data accompanies you everywhere.
- **Theme-Aware**: Seamlessly switch between "Tactical Light" (Blueprint) and "Stealth Dark" (Mission Clock) modes with optimized accessibility.
- **Admin Excellence**: Beneath the sci-fi polish lies a robust system focused on speed, efficiency, and data integrity.

---

## 🚀 Quick Setup

### Database Setup ✅

Fresh database schema with all features ready.  
Run `database/fresh-start.sql` in two parts (see file header comments).

### Email Integration ✅

Brevo email service configured and working (300 emails/day free tier).

**Setup Guide:** [QUICK_START.md](./QUICK_START.md) - 5-minute configuration  
**Detailed Info:** [BREVO_SETUP.md](./BREVO_SETUP.md) - Advanced options  
**Troubleshooting:** [BREVO_TROUBLESHOOTING.md](./BREVO_TROUBLESHOOTING.md) - Common issues

**Note:** First invitation emails may arrive in spam folder (normal for new senders).

---

## Clean Architecture Demo

### SOLID Principles in Action

- **Single Responsibility**: Custom hooks (`useAppState`, `useForm`) separate concerns
- **Open/Closed**: Extensible patterns for new features
- **Interface Segregation**: Focused types (`FinancialState`, `CharacterState`)
- **Dependency Inversion**: Components use abstract hooks, not implementations

### DRY Implementation

```typescript
// Before: Repetitive form handling in every component
// After: One reusable pattern
const { form, createInputHandler, resetForm } = useForm(initialData);
<FormField value={form.field} onChange={createInputHandler("field")} />
```

### Results

- **App.tsx**: 200+ lines → ~110 lines
- **Code duplication**: ~300 lines eliminated
- **File count**: 29 → 24 files (17% reduction)

---

## Project Structure

```
src/
├── hooks/                   # SOLID: Single responsibility
│   ├── useAppState.ts      # State management
│   ├── useBalanceCalculations.ts
│   ├── useImportExport.ts
│   └── useForm.ts          # DRY: Generic form handling
├── components/             # Reusable UI (DRY)
│   ├── FormField.tsx       # Universal form input
│   ├── FinanceManager.tsx  # Universal finance component
│   └── [others...]
├── features/               # Feature modules
│   ├── cargo/Cargo.tsx
│   └── pcs/               # Character features
└── utils/                 # Pure business logic
```

---

## Quick Start

Requires Node 24+ and pnpm 12+ (`corepack enable` picks up the version pinned in `package.json`).
npm and yarn are not supported — only `pnpm-lock.yaml` is committed.

```bash
git clone https://github.com/<you>/traveller-dashboard.git
cd traveller-dashboard
pnpm install
cp .env.example .env.local   # add your Supabase URL + anon key
pnpm dev
```

Dependency install scripts are blocked by default; see `allowBuilds` in `pnpm-workspace.yaml`.

**Required configs:**

```ts
// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: "/traveller-dashboard/", // Your repo name
});
```

```css
/* src/index.css */
@import "tailwindcss";

:root {
  /* ... HSL variables ... */
}

body {
  background-color: var(--bg-main);
  color: var(--text-main);
}

.card-modern {
  @apply hud-glass rounded-[2rem] p-8 transition-all duration-500;
}
```

---

## How to Use

1. **Party/Ship**: Add income (+) and expenses (-)
2. **Cargo**: Log buy/sell legs to track profit per ton
3. **Characters**: Select PC → manage ledger/inventory/ammo
4. **Import/Export**: Round-trip with Excel/LibreOffice/Google Sheets

Data persists in PostgreSQL database via Supabase. XLSX format ensures universal compatibility for import/export.

---

## CI & Deployment

GitHub Actions ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)) runs on every push:
format check → lint → type-check → tests → build.

Pushes to `main` that pass are deployed to GitHub Pages automatically. There is no
manual deploy step. A failed check or deploy fails the run, and GitHub emails you.

Setup (once):

- **Settings → Pages → Source**: _GitHub Actions_
- **Settings → Secrets → Actions**: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
  (used by the build and by the daily `touch_db` keep-alive)
- `base` in `vite.config.ts` must match the repo name (`/traveller-dashboard/`)

---

## Architecture Benefits

**Before vs After Refactoring:**

- ❌ Mixed responsibilities → ✅ Clear separation of concerns
- ❌ Repetitive form code → ✅ Single `useForm` pattern
- ❌ Prop drilling → ✅ Custom hooks
- ❌ Inconsistent patterns → ✅ Standardized components

**Performance & Bundle Optimization:**

- **Initial load**: ~201kB (vs 1,161kB) - 83% reduction via code splitting
- **Excel features**: Lazy-loaded only when needed (939kB separate chunk)
- **Fast startup**: App loads instantly, heavy libraries load on-demand
- **Better caching**: Vendor, icons, and Excel chunks cached independently

**Developer Experience:**

- **Easy debugging**: Clear component boundaries
- **Simple testing**: Isolated, focused functions
- **Self-documenting**: Consistent patterns
- **Team-friendly**: New developers understand quickly

---

## Troubleshooting

- **Black screen**: Check DevTools Console for missing React imports
- **Tailwind issues**: Ensure config matches above
- **GitHub Pages blank**: Set correct `base` in `vite.config.ts`
- **XLSX import fails**: Sheet names must match (`Party_Finances`, etc.)

---

[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)

Distributed under the **GNU General Public License v3.0**. See `LICENSE` for more information.

Traveller © Far Future Enterprises / Mongoose Publishing.
