# Mine Intelligence Platform — Implementation Plan (Prototype)

Smart India Hackathon (SIH26023) prototype.
AI-Powered Mining & Geological Intelligence Platform.

**Scope: Frontend-first interactive demo.** All data is mocked. No real backend intelligence.

---

## 1. Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│  Browser                                                          │
│  React SPA (Vite + Tailwind + Recharts + react-router-dom)       │
│                                                                   │
│  ┌─────────┐  ┌──────────────────────────────────────────────┐   │
│  │ Login   │  │  Main App (authenticated)                     │   │
│  │ Page    │  │  ┌──────────┬───────────┬──────────────────┐  │   │
│  │         │  │  │Dashboard │ Assistant │ Production Intel │  │   │
│  │         │  │  │          │ (mock RAG)│ (mock analytics) │  │   │
│  │         │  │  │          │           │                  │  │   │
│  │         │  │  │          │           │ Reports          │  │   │
│  │         │  │  │          │           │ (mock PDF gen)   │  │   │
│  │         │  │  └──────────┴───────────┴──────────────────┘  │   │
│  └─────────┘  └──────────────────────────────────────────────┘   │
│                                                                   │
│  All mock data lives in src/mock/*.js                             │
│  No real API calls except SPA serving                              │
└──────────────────────────────────────────────────────────────────┘
         │
         │  FastAPI only serves static files (built SPA)
         ▼
┌──────────────────────────────────────────────────────────────────┐
│  FastAPI backend — zero business logic                            │
│  - /api/health                                                    │
│  - Mount frontend/dist as static files                            │
└──────────────────────────────────────────────────────────────────┘
```

Key decisions:
- **All intelligence is fake.** Mock data is hardcoded in JS files.
- **React-router-dom** for client-side routing (Login, Dashboard, Assistant, Production, Reports).
- **AuthContext** in React stores `{ isLoggedIn, user }` in state — no real auth, just a context toggle.
- FastAPI remains as-is (thin SPA server + health endpoint). No new backend routes needed.
- Recharts for all charts. Tailwind for all styling. No UI library.

---

## 2. Folder structure (frontend/src)

```
frontend/src/
├── main.jsx                          # React root + BrowserRouter
├── App.jsx                           # Route definitions, AuthContext provider
├── index.css                         # Tailwind base
├── mock/
│   ├── aiResponses.js                # Q&A pairs with document citations
│   ├── productionData.js             # monthly production by mine/mineral
│   ├── anomalies.js                  # flagged data points
│   ├── forecastData.js               # historical + forecasted values
│   ├── documents.js                  # ingested document metadata
│   └── reports.js                    # generated report templates
├── context/
│   └── AuthContext.jsx               # { isLoggedIn, user, login, logout }
├── components/
│   ├── Layout.jsx                    # sidebar + topbar + outlet
│   ├── Sidebar.jsx                   # nav links
│   ├── StatCard.jsx                  # dashboard stat cards
│   ├── ChartCard.jsx                 # Recharts wrapper with title + legend
│   └── EmptyState.jsx               # placeholder when no data
├── pages/
│   ├── Login.jsx                     # login form (mock)
│   ├── Dashboard.jsx                 # overview stats + mini charts
│   ├── Assistant.jsx                 # chat UI + document library + citations
│   ├── Production.jsx                # trends, targets, comparisons, anomalies, forecast
│   └── Reports.jsx                   # report list + preview + "generate" flow
└── utils/
    └── formatters.js                 # number/date formatters
```

Backend is unchanged — no new files, no new endpoints.

---

## 3. Pages (what the user sees and does)

### 3a. Login (`Login.jsx`)

- Clean form: username + password inputs + "Sign In" button.
- Pre-filled placeholder credentials (any non-empty → "logged in").
- On submit: set `AuthContext.isLoggedIn = true`, navigate to `/dashboard`.
- Styled: centered card, mining-themed background (gradient or subtle pattern).
- No real validation. No token. No session persistence beyond React state.

### 3b. Dashboard (`Dashboard.jsx`)

Overview screen summarizing everything at a glance.

- **Stat cards row** (4 cards): Total Documents Ingested, Production Records, Active Anomalies, Reports Generated.
- **Production trend mini-chart**: last 6 months total production (Recharts AreaChart).
- **Recent anomalies mini-table**: last 3-5 anomalies with severity badges.
- **Recent reports mini-list**: last 3 generated reports.
- All data from mock modules.

### 3c. AI Mining Assistant (`Assistant.jsx`)

Two-panel layout: left = document library, right = chat.

- **Left panel — Document Library**:
  - List of mock ingested documents (PDF icons, filename, page count, date).
  - Upload button (opens file dialog, but doesn't actually process — just adds a mock entry to the list).
  - Each document is clickable → shows a "preview" card (mock).

- **Right panel — Chat**:
  - Message list (user question → assistant answer).
  - Input box at the bottom.
  - On send: find a matching mock response from `aiResponses.js` by keyword, or use a default "I don't have that in my knowledge base."
  - Each assistant answer includes **inline citations**: small pill/chip badges like `[Geological Survey 2024, p.12]` — clickable → highlights source document + page.
  - Typing indicator animation (fake 1-2s delay before response).

- **Mock Q&A pairs** (from `aiResponses.js`):
  - ~10-15 pre-built Q&A pairs covering realistic mining topics.
  - Each has: question keywords, answer text, list of citations `{ doc, page, snippet }`.

### 3d. Production Intelligence (`Production.jsx`)

Full-page analytics dashboard with tabbed sections.

- **Filters bar**: mine selector (dropdown), mineral selector (dropdown), date range.

- **Section 1 — Production Trends**:
  - Line chart: monthly actual production over 12 months.
  - Optional: overlay target line.
  - Tooltip with period + value.

- **Section 2 — Target vs Actual**:
  - Grouped bar chart: each month shows target bar + actual bar side by side.
  - Deviation highlighted (green if actual ≥ target, red if below).

- **Section 3 — Mine/Mineral Comparison**:
  - Horizontal bar chart comparing production across mines (or minerals).
  - Sortable.

- **Section 4 — Anomalies**:
  - Table: Date | Mine | Mineral | Value | Expected | Deviation | Severity.
  - Color-coded severity: red (high), amber (medium), blue (low).
  - Sparkline chart for the anomaly's series.

- **Section 5 — Forecast**:
  - Line chart: historical actuals (solid) + forecast (dashed) + confidence band (shaded area).
  - Tooltip shows predicted vs actual.

All charts use Recharts. All data from mock modules. Filters dynamically recompute which mock data subset to show.

### 3e. Intelligence Reports (`Reports.jsx`)

- **Report list**: cards showing generated reports with title, date, summary.
  - Mock 3-4 pre-generated reports.

- **"Generate Report" button**:
  - Click → shows a loading spinner (1-2s fake delay).
  - "New report" appears at the top of the list with mock content.

- **Report preview**:
  - Click a report card → expands a full preview pane (mock PDF-like layout).
  - Sections: Executive Summary, AI Assistant Findings (with citations), Production Analytics (mini charts), Anomaly Summary, Forecast Summary.
  - Styled to look like a document (white card, subtle shadows, page-like proportions).

- **Download button**: triggers a "download" that actually creates a mock `.txt` blob (or nothing — just the UI affordance).

---

## 4. Mock data (`src/mock/`)

### aiResponses.js
```js
// ~12-15 Q&A pairs
// Each: { keywords: ["coal", "reserves"], answer: "...", citations: [{doc, page, snippet}] }
// Topics: geological survey findings, mineral reserves, safety compliance,
//         environmental assessment, mine closure criteria, blasting protocols,
//         water table analysis, ore grade estimation, equipment maintenance
```

### productionData.js
```js
// ~12 months × 4 mines × 2 minerals = ~96 records
// Each: { period: "2024-01", mine: "Singrauli", mineral: "Coal", target: 4500, actual: 4320, unit: "tonnes" }
// Mines: Singrauli, Jharia, Raniganj, Talcher
// Minerals: Coal, Iron Ore
// Values realistic for Indian coal/iron ore production (thousands of tonnes)
```

### anomalies.js
```js
// ~6-8 anomalies pulled from productionData where actual deviates >15% from target
// Each: { period, mine, mineral, value, expected, deviation: "+22%", severity: "high" }
```

### forecastData.js
```js
// Last 12 months actual + next 6 months forecast for a selected mine/mineral
// Each: { period, type: "actual"|"forecast", value, lower, upper }
```

### documents.js
```js
// ~6 mock ingested documents
// Each: { id, filename, pages, ingestedAt, status: "processed" }
// Filenames: "Geological_Survey_Singrauli_2024.pdf", "Environmental_Assessment_Jharia.pdf", etc.
```

### reports.js
```js
// ~3 mock generated reports
// Each: { id, title, date, summary, sections: [...] }
```

---

## 5. Dependencies (what changes)

### Frontend (`package.json` — add):
```
react-router-dom          # client-side routing
```

### Frontend (keep existing):
```
react, react-dom, vite, @vitejs/plugin-react, tailwindcss, postcss, autoprefixer, recharts
```

### Backend:
**Nothing changes.** `requirements.txt` stays as-is. No new backend routes.

### .env.example:
**Nothing changes.** No new env vars needed for the prototype.

---

## 6. Routing

```
/               → Redirect to /login (if not authed) or /dashboard (if authed)
/login          → Login.jsx
/dashboard      → Dashboard.jsx        (protected)
/assistant      → Assistant.jsx        (protected)
/production     → Production.jsx       (protected)
/geology        → Geology.jsx          (protected)  mock map + layers + imagery
/reports        → Reports.jsx          (protected)
/documents      → Documents.jsx        (protected)
```

Protected = redirect to `/login` if not authenticated (via AuthContext).

### Geological & Map Insights (`Geology.jsx`)

Mock-only spatial/geological module (no real GIS, no new dependencies). Built with plain SVG/CSS.
- **Geological Map**: SVG mock of Mine X lease boundary with clickable feature nodes (infrastructure,
  reserve seam, hazard) — fault line + water-ingress zone shown. Selecting a node shows its details.
- **Geological Layers**: depth-profile cards (overburden, coal seam, sandstone, shale) with material
  and percentage bars.
- **Imagery Insights**: sample imagery-analyses (blast pattern, stratigraphy, surface damage) with tags.
- KPI cards: estimated reserves, seam thickness, active hazards, data sources.
- Clearly labelled "Prototype mock map / demo data" — not real GIS.

---

## 7. Implementation phases

### Phase A — Routing + Auth + Layout
- Add `react-router-dom`.
- Create `AuthContext`, `Login.jsx`, `Layout.jsx` (sidebar + topbar), `Sidebar.jsx`.
- Wire routes in `App.jsx`.
- **Result:** Can log in, see sidebar, navigate between placeholder pages.

### Phase B — Dashboard
- Create `StatCard.jsx`, `ChartCard.jsx`.
- Build `Dashboard.jsx` with stat cards + mini charts.
- Create mock data files.
- **Result:** Dashboard shows populated stats and charts.

### Phase C — AI Assistant
- Build `Assistant.jsx` (two-panel: doc library + chat).
- Implement keyword-match response logic.
- Style chat bubbles, citations, typing indicator.
- **Result:** Can "upload" mock docs, ask questions, see grounded answers with citations.

### Phase D — Production Intelligence
- Build `Production.jsx` (filters + 5 chart/visualization sections).
- All Recharts components (AreaChart, BarChart, LineChart).
- Anomaly table with severity badges.
- **Result:** Interactive analytics dashboard with mock data.

### Phase E — Reports
- Build `Reports.jsx` (report list + generate + preview).
- Mock report generation with loading animation.
- Styled report preview.
- **Result:** Can "generate" reports, preview them, and see the download button.

### Phase F — Polish
- Consistent color theme (mining-industry feel: deep blues, slate, amber accents).
- Loading states, empty states, hover effects, transitions.
- Responsive layout (basic mobile support).
- Demo walkthrough flow (login → dashboard → assistant → production → reports).

---

## 8. Key UI/UX decisions

- **Sidebar navigation** (not tabs) — more professional, scales better.
- **Color palette**: slate-900 sidebar, white content area, blue-600 primary, amber-500 accent for warnings/anomalies.
- **Chat UI**: left-aligned user bubbles (blue), right-aligned assistant bubbles (white/gray). Citations are small clickable chips below the answer.
- **Charts**: consistent Recharts theme — same colors, same font, same tooltip style across all pages.
- **Report preview**: mock "document" with white background, subtle shadow, and page-like proportions.
- **No modals** (except maybe a toast notification) — everything inline for a smoother demo flow.
