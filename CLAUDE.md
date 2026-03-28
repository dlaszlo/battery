# Battery Cell Tracker

## Project Overview

Battery cell inventory web application. Users track their battery cells (18650, 21700, AA, etc.) with main data and measurement history. Auto-scrap detection flags cells when capacity drops below a configurable threshold. Data is stored in a private GitHub repo via Fine-grained PAT + GitHub Contents API.

## Tech Stack

- **Next.js 16** (App Router, static export)
- **React 19** + **TypeScript 5** (strict mode)
- **Tailwind CSS 4**
- **Zustand 5** (state management + localStorage persist middleware)
- **Recharts 2** (capacity trend charts)
- **GitHub Contents API** (data persistence in private repo)

## Project Structure

```
src/
├── app/              # Next.js App Router pages
│   ├── cells/        # Cell list + detail view (?id=X)
│   ├── add/          # New cell form
│   ├── compare/      # Cell comparison page
│   ├── templates/    # Cell template management
│   ├── settings/     # Settings + token management
│   └── help/         # Help page + legal disclaimer
├── components/
│   ├── layout/       # Navbar, Footer
│   ├── cells/        # CellTable, CellForm, CellDetail, StatusBadge
│   ├── measurements/ # MeasurementList, MeasurementForm, CapacityChart
│   ├── templates/    # TemplateForm
│   ├── dashboard/    # StatCard, DashboardGrid
│   ├── onboarding/   # OnboardingWizard (4 steps)
│   └── ui/           # Button, Input, Select, ComboBox, Modal, ConfirmDialog
├── lib/
│   ├── types.ts      # TypeScript interfaces (Cell, CellTemplate, Measurement, etc.)
│   ├── store.ts      # Zustand store + CRUD + persist
│   ├── github.ts     # GitHub API client (generic fetchFile/saveFile)
│   ├── sync.ts       # Multi-file sync logic (cells.json, settings.json, templates.json)
│   ├── constants.ts  # Dropdown options, file paths, defaults
│   ├── utils.ts      # Formatting helpers
│   ├── i18n.ts       # Hungarian/English translations
│   └── scrap-detection.ts
└── hooks/
    ├── useCells.ts
    ├── useGitHub.ts
    └── useSync.ts
```

## Language & Communication

- **UI language**: Hungarian
- **Source code**: English (variable names, function names, comments)
- **Conversation**: Hungarian

## Architecture Principles

- **SOLID, DRY, Clean Code** - always
- **Static export** (`output: "export"` in next.config.ts) for free hosting
- **No dynamic routes** - use query params (`/cells?id=X`) for detail views
- **All pages are client components** (`"use client"`) since data comes from localStorage/GitHub API
- **Zustand persist** middleware for localStorage caching
- **GitHub Contents API** for persistent storage (multi-file: cells.json, settings.json, templates.json)
- **Automatic migration** from legacy single data.json to multi-file format

## Data Model

- **Cell ID**: String type, user-provided (e.g., "01", "02", "123") - NOT auto-generated
- **Measurement ID**: UUID (auto-generated)
- **Status values** (Hungarian): "Új", "Használt", "Bontott", "Selejt"
- **Cell Template**: Reusable datasheet specs (brand, model, formFactor, chemistry, capacity, discharge currents, weight). Soft delete via `archived` flag. Cells reference templates via `templateId` but are independent after creation.
- **Discharge current**: Split into `continuousDischargeCurrent` and `peakDischargeCurrent`
- **Multi-file storage**: `cells.json`, `settings.json`, `templates.json` in the user's private GitHub repo (auto-migrated from legacy single `data.json`)

## Auth

- **Fine-grained Personal Access Token** (PAT) - scoped to a single repo
- Token stored in localStorage (never sent to any server except GitHub API)
- No backend needed, no OAuth server

## Key Conventions

- Prefer small, focused components
- UI components in `src/components/ui/` are generic and reusable
- Domain components organized by feature (cells, measurements, templates, dashboard, onboarding)
- Constants and dropdown options in `src/lib/constants.ts`
- All TypeScript interfaces in `src/lib/types.ts`

## Build & Deploy

```bash
npm run dev      # Development server
npm run build    # Static export to out/
npm run lint     # ESLint check
```

- Hosted on GitHub Pages (dlaszlo.github.io/battery/)
- Auto-deploy on push to main branch

## Testing Changes

1. `npm run build` must succeed without errors
2. `npm run lint` must pass
3. Verify in browser: cells CRUD, measurements, templates, comparison, auto-scrap detection, GitHub sync
