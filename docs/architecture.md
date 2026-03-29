# Battery Cell Tracker - Architecture Document

**Version:** 2.0
**Last Updated:** 2026-03-28
**Status:** Draft

---

## 1. Architectural Philosophy

### 1.1 Zero-Backend Architecture

The Battery Cell Tracker is a **fully client-side application**. There is no application server, no database server, no backend API, and no intermediary service of any kind.

```mermaid
graph LR
    subgraph "What EXISTS"
        Browser["User's Browser<br/>(all application logic)"]
        GitHub["GitHub Repository<br/>(file storage only)"]
        Pages["GitHub Pages<br/>(static file hosting)"]
    end

    subgraph "What does NOT exist"
        style NoBackend fill:#7f1d1d,stroke:#f87171,color:#fecaca,stroke-dasharray: 5 5
        NoBackend["❌ No Application Server<br/>❌ No Database<br/>❌ No Auth Server<br/>❌ No API Gateway<br/>❌ No Analytics<br/>❌ No CDN (except GitHub's)"]
    end

    Pages -->|serves static HTML/JS/CSS| Browser
    Browser -->|reads/writes JSON files| GitHub
```

**Key implications:**
- The application is a set of static files (HTML, JS, CSS) served by GitHub Pages
- All computation happens in the user's browser
- GitHub is used purely as a key-value store (file path → JSON content)
- The GitHub PAT (Personal Access Token) is stored **only** in the user's browser, encrypted
- No user data ever passes through any server we control

### 1.2 Why Zero-Backend?

| Concern | How It's Solved |
|---------|----------------|
| Hosting cost | Free (GitHub Pages) |
| Server maintenance | None needed |
| Scalability | Each user has their own GitHub repo |
| Privacy | Data only exists in user's browser + their own GitHub repo |
| Authentication | GitHub PAT (user manages their own token) |
| Availability | GitHub's 99.9% uptime SLA |
| Vendor lock-in | Data is plain JSON in a Git repo the user owns |

### 1.3 Trust Boundaries

```mermaid
graph TB
    subgraph "Trusted Zone (User Controls)"
        Browser["Browser<br/>localStorage + Zustand"]
        UserRepo["User's GitHub Repo<br/>(their PAT, their data)"]
    end

    subgraph "Untrusted Zone"
        GitHubAPI["GitHub API<br/>(transport only)"]
        GitHubPages["GitHub Pages<br/>(serves static files)"]
    end

    Browser -->|"HTTPS + Bearer token"| GitHubAPI
    GitHubAPI -->|"reads/writes"| UserRepo
    GitHubPages -->|"serves app code"| Browser

    style Browser fill:#166534,stroke:#4ade80,color:#bbf7d0
    style UserRepo fill:#166534,stroke:#4ade80,color:#bbf7d0
    style GitHubAPI fill:#78350f,stroke:#fbbf24,color:#fef3c7
    style GitHubPages fill:#78350f,stroke:#fbbf24,color:#fef3c7
```

**What we trust:**
- The user's browser (executes our code, stores encrypted PAT)
- The user's GitHub repository (stores their data)

**What we don't control:**
- GitHub API (transport layer - we use HTTPS)
- GitHub Pages (serves our static files - no secrets involved)

---

## 2. System Context

### 2.1 Context Diagram

```mermaid
C4Context
    title System Context - Battery Cell Tracker

    Person(user, "Battery Hobbyist", "Tracks rechargeable cells,<br/>records measurements,<br/>compares cells for pairing")

    System(app, "Battery Cell Tracker", "Client-side PWA for battery<br/>inventory and measurement tracking")

    System_Ext(github, "GitHub", "Hosts static files (Pages)<br/>and stores data (Contents API)")

    Rel(user, app, "Uses via browser")
    Rel(app, github, "Reads/writes JSON")
    Rel(github, app, "Serves static files")
```

### 2.2 Multi-Device Context

```mermaid
graph TB
    subgraph "Device A (Desktop)"
        BrowserA["Browser<br/>localStorage A<br/>Client ID: a1b2c3"]
    end

    subgraph "Device B (Phone)"
        BrowserB["Browser<br/>localStorage B<br/>Client ID: fe12be"]
    end

    subgraph "GitHub Repository"
        cells["cells.json"]
        settings["settings.json"]
        templates["templates.json"]
        clientA["settings_a1b2c3.json"]
        clientB["settings_fe12be.json"]
    end

    BrowserA -->|"read/write"| cells
    BrowserA -->|"read/write"| settings
    BrowserA -->|"read/write"| templates
    BrowserA -->|"read/write own"| clientA

    BrowserB -->|"read/write"| cells
    BrowserB -->|"read/write"| settings
    BrowserB -->|"read/write"| templates
    BrowserB -->|"read/write own"| clientB

    style BrowserA fill:#3b82f6,color:#fff
    style BrowserB fill:#8b5cf6,color:#fff
```

Each device:
- Reads/writes the **shared** data files (cells, settings, templates) using three-way merge
- Reads/writes **only its own** client settings file (no merge needed)
- Has its own localStorage with independent base snapshots and encrypted PAT

---

## 3. Application Architecture

### 3.1 Layer Diagram

```mermaid
graph TD
    subgraph "Presentation Layer"
        direction LR
        Pages["Pages<br/>(App Router)"]
        Components["Components<br/>(React)"]
        UILib["UI Library<br/>(Button, Input, Modal, etc.)"]
    end

    subgraph "Application Layer"
        direction LR
        Hooks["Custom Hooks<br/>(useCells, useSync, useGitHub)"]
        I18N["i18n<br/>(translations)"]
        Utils["Utils<br/>(formatting)"]
    end

    subgraph "State Layer"
        direction LR
        Store["Zustand Store<br/>(single source of truth)"]
        Persist["Persist Middleware<br/>(localStorage)"]
    end

    subgraph "Infrastructure Layer"
        direction LR
        Sync["Sync Engine<br/>(three-way merge)"]
        GitHubClient["GitHub Client<br/>(REST API)"]
        Crypto["Crypto Module<br/>(AES-256-GCM)"]
        ScrapDetect["Scrap Detection<br/>(threshold logic)"]
    end

    subgraph "External"
        LS["localStorage"]
        GH["GitHub API"]
    end

    Pages --> Components
    Components --> UILib
    Components --> Hooks
    Hooks --> Store
    Hooks --> I18N
    Components --> I18N
    Components --> Utils
    Store --> Persist
    Persist --> LS
    Store --> Sync
    Sync --> GitHubClient
    GitHubClient --> GH
    Store --> Crypto
    Crypto --> LS
    Store --> ScrapDetect
```

### 3.2 Layer Responsibilities

| Layer | Responsibility | May Depend On |
|-------|---------------|---------------|
| **Presentation** | Render UI, handle user input, display data | Application, State |
| **Application** | Business hooks, translations, formatting | State |
| **State** | Single source of truth, CRUD operations, persistence | Infrastructure |
| **Infrastructure** | GitHub API calls, encryption, sync algorithm, scrap detection | External systems |

**Dependency rule:** Layers may only depend on layers below them. The Presentation layer never directly calls GitHub API or accesses localStorage.

### 3.3 Module Dependency Graph

```mermaid
graph TD
    pages["app/*/page.tsx"] --> components
    components["components/*"] --> hooks
    components --> ui["components/ui/*"]
    components --> i18n["lib/i18n.ts"]
    components --> utils["lib/utils.ts"]
    components --> constants["lib/constants.ts"]
    components --> types["lib/types.ts"]

    hooks["hooks/*"] --> store["lib/store.ts"]
    hooks --> types

    store --> sync["lib/sync.ts"]
    store --> crypto["lib/crypto.ts"]
    store --> scrap["lib/scrap-detection.ts"]
    store --> types
    store --> constants

    sync --> github["lib/github.ts"]
    sync --> merge["lib/merge.ts (V2)"]
    sync --> types

    github --> types

    style pages fill:#3b82f6,color:#fff
    style store fill:#8b5cf6,color:#fff
    style sync fill:#10b981,color:#fff
    style github fill:#f59e0b,color:#fff
    style crypto fill:#ef4444,color:#fff
```

---

## 4. Data Architecture

### 4.1 Data Flow Overview

```mermaid
graph LR
    subgraph "User Input"
        Form["Forms<br/>(CellForm, MeasurementForm)"]
    end

    subgraph "State Management"
        Store["Zustand Store"]
        LS["localStorage"]
    end

    subgraph "Sync"
        Merge["Three-Way Merge"]
        API["GitHub Contents API"]
    end

    subgraph "Display"
        Tables["Tables"]
        Charts["Charts"]
        Cards["Stat Cards"]
    end

    Form -->|"addCell(), addMeasurement()"| Store
    Store -->|"persist middleware"| LS
    Store -->|"debounced push"| Merge
    Merge -->|"PUT"| API
    API -->|"GET (pull)"| Merge
    Merge -->|"merged result"| Store
    Store -->|"reactive selectors"| Tables
    Store -->|"reactive selectors"| Charts
    Store -->|"computed stats"| Cards
```

### 4.2 Storage Architecture

**No data is stored on any server we control.** All data resides in exactly two locations:

```mermaid
graph TB
    subgraph "Location 1: Browser localStorage"
        LS_Data["battery-data<br/>(cells + settings)"]
        LS_Templates["battery-templates"]
        LS_Config["battery-github-config<br/>(encrypted PAT)"]
        LS_SHA["battery-sha-*<br/>(file SHAs)"]
        LS_Base["battery-sync-base-*<br/>(merge base snapshots)"]
        LS_PIN["battery-pin-attempts"]
        LS_Client["battery-client-id"]
    end

    subgraph "Location 2: User's GitHub Repository"
        GH_Cells["cells.json"]
        GH_Settings["settings.json"]
        GH_Templates["templates.json"]
        GH_Client["settings_{clientId}.json"]
    end

    LS_Data -.->|"sync"| GH_Cells
    LS_Data -.->|"sync"| GH_Settings
    LS_Templates -.->|"sync"| GH_Templates

    style LS_Config fill:#7f1d1d,stroke:#f87171,color:#fecaca
```

**What is NOT stored anywhere:**
- User's PIN (only used transiently to derive encryption key)
- Plaintext GitHub PAT (always encrypted at rest)
- Usage analytics or telemetry
- Server-side sessions or cookies
- Any data on our infrastructure

### 4.3 Data Ownership

| Data | Owner | Location | Encrypted |
|------|-------|----------|-----------|
| Cell inventory | User | localStorage + their GitHub repo | No |
| Settings | User | localStorage + their GitHub repo | No |
| Templates | User | localStorage + their GitHub repo | No |
| GitHub PAT | User | localStorage only | Yes (AES-256-GCM) |
| PIN | User | User's memory only | N/A (never stored) |
| App source code | Project | GitHub Pages (public) | No |

---

## 5. Security Architecture

### 5.1 Threat Model

| Threat | Mitigation |
|--------|-----------|
| PAT theft from localStorage | AES-256-GCM encryption with PBKDF2-derived key |
| Brute-force PIN attack | Progressive lockout delays, config wipe after 10 attempts |
| Session hijacking | Auto-lock after 30 minutes inactivity |
| Man-in-the-middle | HTTPS for all GitHub API calls |
| XSS | React's built-in escaping, no `dangerouslySetInnerHTML` |
| Malicious app update | User can verify source code (open source) |
| Data loss | Three-way merge prevents overwrites; export/import for backup |
| Remote data corruption | No force push; remote always protected |

### 5.2 Encryption Flow

```mermaid
sequenceDiagram
    participant User
    participant App
    participant Crypto as Web Crypto API
    participant LS as localStorage

    Note over User,LS: Setup (once)
    User->>App: Enter PAT + PIN
    App->>Crypto: Generate random salt (16 bytes) + IV (12 bytes)
    App->>Crypto: PBKDF2(PIN, salt, 200000, SHA-256) → AES key
    App->>Crypto: AES-GCM-encrypt(PAT, key, IV) → ciphertext
    App->>LS: Store {ciphertext, salt, IV, iterations}

    Note over User,LS: Unlock (each session)
    User->>App: Enter PIN
    App->>LS: Read {ciphertext, salt, IV, iterations}
    App->>Crypto: PBKDF2(PIN, salt, iterations, SHA-256) → AES key
    App->>Crypto: AES-GCM-decrypt(ciphertext, key, IV) → PAT
    alt Decryption succeeds
        App->>App: PAT in memory, session unlocked
    else Decryption fails
        App->>App: Increment failure counter, apply lockout delay
    end
```

### 5.3 Session Lifecycle

```mermaid
stateDiagram-v2
    [*] --> NoConfig: First visit
    NoConfig --> Onboarding: User starts setup
    Onboarding --> Encrypted: Setup complete
    Encrypted --> Unlocked: Correct PIN
    Unlocked --> Encrypted: 30min inactivity
    Unlocked --> Encrypted: Manual lock
    Encrypted --> Encrypted: Wrong PIN (delay)
    Encrypted --> NoConfig: 10 failed PINs (wipe)

    state NoConfig {
        [*] --> ShowOnboarding
    }
    state Encrypted {
        [*] --> ShowPINDialog
    }
    state Unlocked {
        [*] --> FullAccess
    }
```

---

## 6. Sync Architecture

### 6.1 Sync Overview

```mermaid
graph TB
    subgraph "Triggers"
        T1["App Startup"]
        T2["Tab Focus"]
        T3["Sync Button"]
        T4["Save (debounced 3s)"]
        T5["30s Polling"]
    end

    subgraph "Sync Engine"
        Mutex["Mutex Guard"]
        Pull["Pull (GET files)"]
        Merge["Three-Way Merge"]
        Push["Push (PUT dirty files)"]
        Retry["Conflict Retry<br/>(max 5, backoff)"]
    end

    subgraph "State Updates"
        BaseUpdate["Update Base Snapshots"]
        SHAUpdate["Update SHAs"]
        StoreUpdate["Update Zustand Store"]
        FlagClear["Clear Dirty Flags"]
    end

    T1 --> Mutex
    T2 -->|"SHA check only"| Mutex
    T3 --> Mutex
    T4 --> Mutex
    T5 -->|"SHA check only"| Mutex

    Mutex --> Pull
    Pull --> Merge
    Merge --> Push
    Push -->|"409"| Retry
    Retry --> Pull
    Push -->|"Success"| BaseUpdate
    BaseUpdate --> SHAUpdate
    SHAUpdate --> StoreUpdate
    StoreUpdate --> FlagClear
```

### 6.2 Merge Architecture

Detailed merge algorithm specified in [Git Sync & Merge Specification](git-sync-merge-specification.md).

```mermaid
graph TD
    subgraph "Input"
        Base["Base<br/>(last synced snapshot)"]
        Remote["Remote<br/>(fetched from GitHub)"]
        Local["Local<br/>(current Zustand state)"]
    end

    subgraph "Merge Process"
        EntityMatch["Match entities by internalId"]
        FieldCompare["Compare each field:<br/>base vs local vs remote"]
        Decision["Apply rules:<br/>unchanged → keep<br/>only remote changed → accept<br/>only local changed → keep<br/>both changed → local wins"]
    end

    subgraph "Output"
        Merged["Merged Result"]
    end

    Base --> EntityMatch
    Remote --> EntityMatch
    Local --> EntityMatch
    EntityMatch --> FieldCompare
    FieldCompare --> Decision
    Decision --> Merged
```

---

## 7. Component Architecture

### 7.1 Page-Component Mapping

```mermaid
graph TD
    subgraph "App Shell"
        Layout["layout.tsx"]
        AppShell["AppShell"]
        Navbar["Navbar"]
        Footer["Footer"]
        PinDialog["PinDialog"]
    end

    subgraph "Pages"
        Dashboard["/ (Dashboard)"]
        Cells["/ cells"]
        Add["/add"]
        Compare["/compare"]
        Templates["/templates"]
        Settings["/settings"]
        Help["/help"]
    end

    subgraph "Feature Components"
        DashboardGrid["DashboardGrid + StatCard"]
        CellTable["CellTable"]
        CellDetail["CellDetail"]
        CellForm["CellForm"]
        MeasurementForm["MeasurementForm"]
        MeasurementList["MeasurementList"]
        CapacityChart["CapacityChart"]
        EventLog["EventLog"]
        TemplateForm["TemplateForm"]
    end

    Layout --> AppShell
    AppShell --> Navbar
    AppShell --> Footer
    AppShell --> PinDialog

    Dashboard --> DashboardGrid
    Cells --> CellTable
    Cells --> CellDetail
    CellDetail --> CellForm
    CellDetail --> MeasurementForm
    CellDetail --> MeasurementList
    CellDetail --> CapacityChart
    CellDetail --> EventLog
    Add --> CellForm
    Templates --> TemplateForm
```

### 7.2 State Flow in Components

```mermaid
graph LR
    Store["Zustand Store<br/>(single source of truth)"]

    Store -->|"useCells()"| CellTable
    Store -->|"getCell(id)"| CellDetail
    Store -->|"settings"| MeasurementForm
    Store -->|"templates"| TemplateForm
    Store -->|"useCellStats()"| DashboardGrid
    Store -->|"syncState"| Navbar

    CellTable -->|"filters, sort"| useCells["useCells hook<br/>(derived data)"]
    useCells --> Store

    style Store fill:#8b5cf6,color:#fff
```

All components read from the Zustand store via hooks. Components never fetch data directly from localStorage or GitHub. The store is the single source of truth.

---

## 8. Deployment Architecture

### 8.1 Build & Deploy Pipeline

```mermaid
flowchart LR
    Dev["Developer"] -->|"git push main"| GH["GitHub"]
    GH -->|"triggers"| Actions["GitHub Actions"]
    Actions -->|"npm ci + npm run build"| Build["Static Build<br/>(out/ directory)"]
    Build -->|"upload artifact"| Pages["GitHub Pages<br/>dlaszlo.github.io/battery/"]
    Pages -->|"serves"| Users["Users' Browsers"]
```

### 8.2 Infrastructure

| Component | Service | Cost |
|-----------|---------|------|
| Static hosting | GitHub Pages | Free |
| Data storage | GitHub repository (user's own) | Free |
| CI/CD | GitHub Actions | Free (public repo) |
| CDN | GitHub Pages built-in | Free |
| SSL/TLS | GitHub Pages (automatic) | Free |
| Domain | github.io subdomain | Free |

**Total infrastructure cost: $0/month**

### 8.3 Build Artifacts

```
out/                               # Static export output
├── index.html                     # Dashboard page
├── cells/index.html               # Cells page
├── add/index.html                 # Add cell page
├── compare/index.html             # Compare page
├── templates/index.html           # Templates page
├── settings/index.html            # Settings page
├── help/index.html                # Help page
├── _next/                         # JS/CSS bundles
├── manifest.json                  # PWA manifest
├── sw.js                          # Service Worker
├── icon-192.png                   # PWA icon
└── icon-512.png                   # PWA icon
```

---

## 9. PWA Architecture

### 9.1 Service Worker Strategy

```mermaid
flowchart TD
    Request["Browser Request"] --> SW["Service Worker"]
    SW --> Network{"Network available?"}
    Network -->|Yes| Fetch["Fetch from network"]
    Fetch --> Cache["Update cache"]
    Cache --> Response["Return response"]
    Network -->|No| CacheLookup["Look up in cache"]
    CacheLookup --> CacheHit{"Cache hit?"}
    CacheHit -->|Yes| CachedResponse["Return cached response"]
    CacheHit -->|No| Offline["Show offline page"]

    GitHubReq["GitHub API Request"] --> Skip["Skip Service Worker<br/>(never cached)"]
```

**Strategy:** Network-first with cache fallback.
- App shell and assets are cached for fast loading
- GitHub API calls are **never cached** by the Service Worker
- Navigation requests fall back to cached index.html when offline

### 9.2 Installation

The app is installable as a PWA on:
- **Android:** Chrome "Add to Home Screen"
- **iOS:** Safari "Add to Home Screen"
- **Desktop:** Chrome/Edge "Install app"

---

## 10. Error Handling Architecture

### 10.1 Error Propagation

```mermaid
graph TD
    subgraph "Infrastructure Errors"
        NetworkErr["Network Error"]
        APIErr["GitHub API Error<br/>(401, 404, 409, 429, 5xx)"]
        CryptoErr["Crypto Error<br/>(wrong PIN)"]
    end

    subgraph "Error Handling"
        SyncEngine["Sync Engine<br/>(retry + backoff)"]
        Store["Store<br/>(syncState.error)"]
    end

    subgraph "User Feedback"
        Toast["Toast Notification"]
        Badge["Sync Status Badge"]
        InlineErr["Inline Error Message"]
    end

    NetworkErr --> SyncEngine
    APIErr --> SyncEngine
    SyncEngine -->|"retryable"| SyncEngine
    SyncEngine -->|"final error"| Store
    Store --> Toast
    Store --> Badge
    CryptoErr --> InlineErr
```

### 10.2 Error Categories

| Category | Examples | Handling |
|----------|---------|---------|
| Validation | Missing required field, invalid format | Inline field error, block submit |
| Transient | Network timeout, 5xx, 409 conflict | Retry with backoff |
| Auth | 401/403, expired token | Show re-auth prompt |
| Client | Wrong PIN, corrupted data | Error message, recovery options |
| Rate limit | 429 | Show message, wait for reset |

---

## 11. Cross-Cutting Concerns

### 11.1 Internationalization

```
User selects language (client setting)
        │
        ▼
t("key", language) ──► Translation map ──► Localized string
        │
        ▼
Component renders localized text
```

- Two languages: Hungarian (hu), English (en)
- 200+ translation keys
- Template interpolation: `t("key", lang, { count: "5" })`
- Language stored in per-device client settings

### 11.2 Theming

```
User selects theme (client setting)
        │
        ▼
ThemeProvider ──► Applies class to <html>
        │          "light" | "dark" | based on prefers-color-scheme
        ▼
Tailwind dark: variants activate
```

### 11.3 Responsive Design

| Breakpoint | Width | Layout Adjustments |
|-----------|-------|-------------------|
| Default | < 640px | Single column, hidden table columns, hamburger nav |
| SM | 640px+ | Two-column forms |
| MD | 768px+ | More table columns visible |
| LG | 1024px+ | Three-column grids, full table |
| XL | 1280px+ | All table columns visible |

---

## 12. Decision Records

### DR-01: Static Export over Server-Side Rendering

**Decision:** Use `output: "export"` for static HTML generation.
**Reason:** Enables free hosting on GitHub Pages. No server infrastructure to maintain. All data comes from localStorage/GitHub API, so SSR provides no benefit.
**Trade-off:** No dynamic routes (use query params instead), no API routes, no server-side data fetching.

### DR-02: GitHub Contents API over Git Data API

**Decision:** Use the Contents API (`/repos/{owner}/{repo}/contents/{path}`) for file operations.
**Reason:** Simpler to use, no need to manage Git trees/blobs/commits manually. Built-in optimistic concurrency via SHA.
**Trade-off:** One commit per file (no atomic multi-file commits). Max 1 MB per file via REST. The three-way merge algorithm compensates for the non-atomic limitation.

### DR-03: Zustand over Redux/Context

**Decision:** Use Zustand for state management.
**Reason:** Minimal boilerplate, built-in persist middleware for localStorage, works well with React 19. Simple API for a single-store application.
**Trade-off:** Less ecosystem tooling than Redux, but the app's complexity doesn't warrant Redux.

### DR-04: localStorage over IndexedDB

**Decision:** Use localStorage for all client-side persistence.
**Reason:** Simpler API, synchronous access, sufficient for the data sizes involved (< 5 MB). Zustand's persist middleware has built-in localStorage support.
**Trade-off:** 5-10 MB storage limit per origin (browser-dependent). For the expected data size (< 2 MB for 500 cells), this is sufficient.

### DR-05: Field-Level Three-Way Merge over Last-Write-Wins

**Decision:** Implement field-level three-way merge with base snapshot tracking.
**Reason:** Prevents data loss when two devices edit different fields of the same cell concurrently. Last-write-wins at the entity level would discard one device's changes entirely.
**Trade-off:** More complex implementation, requires base snapshot storage in localStorage.

### DR-06: Hard Delete over Soft Delete

**Decision:** Use hard delete for cells (remove from array) instead of soft delete (`deletedAt` field).
**Reason:** Three-way merge handles deletion tracking via base comparison (entity in base but not in local = deleted). Soft delete adds complexity and grows the data file indefinitely.
**Trade-off:** Deleted cells cannot be recovered from the JSON file (but Git history preserves them).

### DR-07: No Offline Mode

**Decision:** Require internet connection; disable editing when offline.
**Reason:** Without a backend to mediate conflicts, offline edits that accumulate over extended periods create complex merge scenarios. The risk of data loss or confusion outweighs the convenience of offline editing.
**Trade-off:** Users cannot use the app without internet. An offline banner blocks edits.

### DR-08: Client-Specific Settings Files

**Decision:** Store per-device settings in separate files (`settings_{clientId}.json`).
**Reason:** Theme, language, and temperature unit preferences may differ between devices (phone vs desktop). Merging these settings would cause one device to overwrite the other's preferences.
**Trade-off:** Multiple small settings files in the repository. Stale client settings files may accumulate if a device is no longer used.

### DR-09: 30-Second Polling with Badge Notification

**Decision:** Poll remote SHA every 30 seconds, show badge but don't auto-merge.
**Reason:** Auto-merging during active editing could confuse the user. A badge lets the user decide when to sync. 30 seconds balances freshness with API rate budget.
**Trade-off:** Changes from other devices appear with up to 30-second delay in the badge. Actual data update requires user action or navigation.
