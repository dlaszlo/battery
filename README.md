# Battery Cell Tracker

A free, open-source web application for tracking your battery cells — 18650, 21700, AA, AAA, and more. Record measurements, monitor capacity degradation over time, and automatically detect cells that should be retired.

**Your data stays yours.** Everything is stored in your own private GitHub repository. There is no backend, no account to create, no subscription. The app runs entirely in your browser.

**No data collection.** The app does not collect, store, or transmit any personal data. Your GitHub token is encrypted in your browser and only sent to the GitHub API. No analytics, no cookies, no tracking.

**No warranty.** The app is provided as-is, free of charge. Use it at your own risk. See the [LICENSE](LICENSE) file for details.

## Live App

**https://dlaszlo.github.io/battery/**

Just open the link and follow the setup wizard. You'll be up and running in under 2 minutes.

## What Does It Do?

Battery Cell Tracker helps you keep a detailed inventory of all your rechargeable cells and their performance over time.

### Cell Inventory

For each cell, you can record:

- **Identity** — brand, model, form factor (18650, 21700, AA, etc.), chemistry (Li-ion, LiFePO4, NiMH, etc.), cathode type (INR, ICR, IMR, etc.), contact type (flat top, button top, tabbed, etc.)
- **Specifications** — nominal capacity, continuous/peak discharge current, weight
- **Purchase info** — where you bought it, when, how much, and a purchase URL
- **Current status** — new, used, salvaged, or scrapped
- **Location** — which device the cell is currently in (you manage your own device list)
- **Grouping** — organize cells into packs or groups
- **Batch number, storage voltage, notes** — anything else you want to track

### Measurements

Each time you test a cell (e.g., with a LiitoKala Lii-700 or similar charger/analyzer), you can log:

- Measured capacity (mAh)
- Discharge current and charge current (mA)
- Internal resistance (mOhm)
- Weight (g)
- Charge and discharge temperature (°C)
- Charge and discharge time
- Test device used (with device image if configured)
- Notes

### Cell Profile Card

Each cell has a profile card showing key stats at a glance: best measured capacity, average internal resistance, measurement count, and last measurement date. Capacity retention bars show health per discharge current.

### Capacity Trend Chart

A line chart for each cell shows how its capacity has changed over time, with **separate lines per discharge current** (color-coded). Filter pills let you show/hide individual currents. Reference lines mark the nominal capacity and scrap threshold.

### Cell Comparison

Compare cells side by side with a dedicated comparison page. Select multiple cells, view their specs and measurements in a table, and use the **best pair matching** algorithm to find cells with the closest capacity at the same discharge current — perfect for building balanced battery packs.

### Cell Templates

Save reusable datasheet specs (brand, model, form factor, chemistry, capacity, discharge currents, weight) as templates. When adding a new cell, select a template to pre-fill the datasheet fields. Templates can be archived (soft delete) and restored.

### State of Health (SoH) Estimation

Each cell gets an automatic health score based on a weighted average of:

- **Capacity retention (50%)** — best measured capacity vs nominal
- **Internal resistance (20%)** — average IR (≤40 mΩ excellent, 40–80 mΩ acceptable, 80–150 mΩ poor, 150+ mΩ critical)
- **Cell age (15%)** — from purchase date (≤1 year excellent, 1–3 years good, 3–6 years fair, 6+ years low)
- **Capacity trend (15%)** — change between first and last measurement (stable/improving = good, declining = bad)

Grades: Excellent (≥85%), Good (70–84%), Fair (50–69%), Poor (30–49%), Critical (<30%).

### Automatic Scrap Detection

When a measurement shows capacity below a configurable threshold (default: 60% of nominal), the cell is automatically flagged as scrapped. You'll never accidentally put a worn-out cell into service.

### Event Log

Every significant change is automatically logged: status changes, device reassignments, measurements added or deleted. You get a full history of what happened to each cell and when.

### Dark Mode

Switch between light, dark, or system-based theme in Settings.

## How Does Data Storage Work?

The app uses the **GitHub Contents API** to read and write data files in a private repository on your GitHub account. Data is split across three JSON files: `cells.json`, `settings.json`, and `templates.json`. This means:

- **Your data is version-controlled** — every save creates a Git commit, so you have full history
- **Your data is private** — only you can access your repository
- **Your data is portable** — you can clone the repo, read the JSON, or export it from the app
- **No server needed** — the app talks directly to GitHub from your browser
- **Online required** — internet connection is needed for sync to maintain data consistency

The app uses a **Fine-grained Personal Access Token** (PAT) scoped to a single repository with minimal permissions. Your token is **encrypted with a PIN code** using AES-GCM (Web Crypto API) and stored in your browser's localStorage. The token is never sent anywhere except the GitHub API.

### PIN Protection

During setup, you'll choose a 4-8 digit PIN code. This PIN is used to encrypt your GitHub token with AES-GCM (PBKDF2 key derivation, 200k iterations). Every time you open the app, you'll need to enter your PIN to decrypt the token and enable GitHub sync.

**Security features:**
- **Brute-force protection** — after repeated wrong PIN entries, progressive delays are enforced (2s, 5s, 10s, 15s, 30s, 60s)
- **Auto-wipe after 10 failed attempts** — the encrypted token is deleted from localStorage. You'll need to re-enter your GitHub token and set a new PIN. No data is lost (your data remains in the GitHub repository)
- **Session timeout** — after 30 minutes of inactivity, the app locks and requires the PIN again
- **PIN not stored** — the PIN is only used momentarily to decrypt the token, it is never persisted

## Setup Guide

### Step 1: Create a Private Repository

Go to [github.com/new](https://github.com/new) and create a new **private** repository named `battery-cell-data`. Leave it empty — the app will initialize it automatically.

### Step 2: Generate a Personal Access Token

1. Go to [github.com/settings/personal-access-tokens/new](https://github.com/settings/personal-access-tokens/new)
2. **Token name:** Battery Tracker (or anything you like)
3. **Expiration:** choose a duration (e.g., 1 year)
4. **Repository access:** Only select repositories — pick `battery-cell-data`
5. **Permissions — Repository permissions — Contents:** Read and write
6. Click **Generate token** and copy it

### Step 3: Open the App

Go to **https://dlaszlo.github.io/battery/** and follow the setup wizard. Paste your token, enter your GitHub username, set a PIN code, and you're done.

Every time you open the app, you'll need to enter your PIN to unlock. If your token expires, you can generate a new one and update it in **Settings — Token refresh** without losing any data.

## Tech Stack

- Next.js 16 (static export)
- React 19 + TypeScript
- Tailwind CSS 4
- Zustand (state management)
- Recharts (charts)
- GitHub Contents API

## Documentation

Detailed documentation is available in the [`docs/`](docs/) directory:

- [Functional Specification](docs/functional-specification.md) — features, requirements, use cases, data model
- [Technical Specification](docs/technical-specification.md) — tech stack, architecture, components, APIs, security
- [Git Sync & Merge Specification](docs/git-sync-merge-specification.md) — three-way merge algorithm, conflict resolution, sync triggers
- [Architecture](docs/architecture.md) — zero-backend philosophy, data flow, deployment, decision records

## Development

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # Static export to out/
npm run lint
```

## License

MIT
