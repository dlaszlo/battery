# Battery Cell Tracker

A free, open-source web application for tracking your battery cells — 18650, 21700, AA, AAA, and more. Record measurements, monitor capacity degradation over time, and automatically detect cells that should be retired.

**Your data stays yours.** Everything is stored in your own private GitHub repository as a single JSON file. There is no backend, no account to create, no subscription. The app runs entirely in your browser.

## Live App

**https://dlaszlo.github.io/battery/**

Just open the link and follow the setup wizard. You'll be up and running in under 2 minutes.

## What Does It Do?

Battery Cell Tracker helps you keep a detailed inventory of all your rechargeable cells and their performance over time.

### Cell Inventory

For each cell, you can record:

- **Identity** — brand, model, form factor (18650, 21700, AA, etc.), chemistry (Li-ion, LiFePO4, NiMH, etc.), cathode type (INR, ICR, IMR, etc.), contact type (flat top, button top, tabbed, etc.)
- **Specifications** — nominal capacity, max discharge current, weight
- **Purchase info** — where you bought it, when, and for how much
- **Current status** — new, used, salvaged, or scrapped
- **Location** — which device the cell is currently in (you manage your own device list)
- **Grouping** — organize cells into packs or groups
- **Batch number, storage voltage, notes** — anything else you want to track

### Measurements

Each time you test a cell (e.g., with a LiitoKala Lii-700 or similar charger/analyzer), you can log:

- Measured capacity (mAh)
- Discharge current (mA)
- Internal resistance (mOhm)
- Test device used
- Notes

### Capacity Trend Chart

A line chart for each cell shows how its capacity has changed over time. A reference line marks the nominal capacity, and another marks the scrap threshold — so you can see at a glance how much life is left.

### Automatic Scrap Detection

When a measurement shows capacity below a configurable threshold (default: 60% of nominal), the cell is automatically flagged as scrapped. You'll never accidentally put a worn-out cell into service.

### Event Log

Every significant change is automatically logged: status changes, device reassignments, measurements added or deleted. You get a full history of what happened to each cell and when.

### Dark Mode

Switch between light, dark, or system-based theme in Settings.

## How Does Data Storage Work?

The app uses the **GitHub Contents API** to read and write a single `data.json` file in a private repository on your GitHub account. This means:

- **Your data is version-controlled** — every save creates a Git commit, so you have full history
- **Your data is private** — only you can access your repository
- **Your data is portable** — you can clone the repo, read the JSON, or export it from the app
- **No server needed** — the app talks directly to GitHub from your browser
- **Works offline** — data is cached in localStorage; GitHub sync happens in the background

The app uses a **Fine-grained Personal Access Token** (PAT) scoped to a single repository with minimal permissions. Your token is **encrypted with a PIN code** using AES-GCM (Web Crypto API) and stored in your browser's localStorage. The token is never sent anywhere except the GitHub API.

### PIN Protection

During setup, you'll choose a 4-8 digit PIN code. This PIN is used to encrypt your GitHub token with AES-GCM (PBKDF2 key derivation). Every time you open the app, you'll need to enter your PIN to decrypt the token and enable GitHub sync. If you forget your PIN, you can disconnect and re-enter your token with a new PIN — no data is lost.

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

## Development

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # Static export to out/
npm run lint
```

## License

MIT
