# Traveller Campaign Dashboard

A browser-based dashboard for **Mongoose Traveller 2e** campaigns with **multi-user support**.  
Track finances, cargo, character inventories, and collaborate with your gaming group through campaign invitations.

**Features**:

- 🎯 Multi-user campaigns with role-based access (Admin/GM/Player)
- 💰 Party/ship finances & cargo trading
- 🎭 Character management (ledgers/inventory/weapons/armour/ammo)
- 📧 Email invitations via Brevo (300 emails/day free tier)
- 💾 Supabase backend with PostgreSQL + Row Level Security
- 🔒 Secure authentication with email/password
- 📱 Responsive design with dark mode

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

```bash
npm create vite@latest traveller-dashboard -- --template react-swc-ts
cd traveller-dashboard
npm i exceljs lucide-react
npm i -D @tailwindcss/vite
npm run dev
```

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
body { @apply bg-white text-gray-900 dark:bg-zinc-950 dark:text-zinc-50; }
.card { @apply rounded-2xl border p-4 shadow-sm bg-white/60 dark:bg-zinc-900/60; }
.btn { @apply inline-flex items-center gap-2 rounded-2xl px-3 py-2 border; }
  @apply rounded-2xl border p-4 shadow-sm bg-white/60 dark:bg-zinc-900/60;
}
.btn {
  @apply inline-flex items-center gap-2 rounded-2xl px-3 py-2 border;
}
```

---

## How to Use

1. **Party/Ship**: Add income (+) and expenses (-)
2. **Cargo**: Log buy/sell legs to track profit per ton
3. **Characters**: Select PC → manage ledger/inventory/ammo
4. **Import/Export**: Round-trip with Excel/LibreOffice/Google Sheets

Data persists in localStorage. XLSX format ensures universal compatibility.

---

## Deploy to GitHub Pages

```bash
# vite.config.ts - set your repo name
export default defineConfig({
  plugins: [react()],
  base: "/traveller-dashboard/",
});

# Deploy
npm run build && npx gh-pages -d dist
```

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

**MIT License** • Traveller © Far Future Enterprises/Mongoose Publishing
