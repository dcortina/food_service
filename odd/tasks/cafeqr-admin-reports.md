# CaféQR Cuba — Admin Reports Page

- **Objective:** Deliver the admin reports page with sales breakdowns, payment
  methods, open cash-close summary, and CSV exports.
- **Branch:** `feat/admin-operations`
- **Delivery strategy:** `ask-on-risk`
- **Test runner:** `corepack pnpm nx build admin` plus HTTP report/CSV checks.
- **Status:** Done — committed on `feat/admin-operations`.

## Specs

### S1 — Range and summary

- The page accepts `desde`/`hasta` and reloads all reports.
- KPI cards show total sales, paid orders, average ticket, and active orders.
- `reporte.ver` is required.

**Acceptance:** the owner sees the same totals as the dashboard for the same
range.

### S2 — Breakdowns

- Sales by channel.
- Payment methods from the dashboard.
- Top products (limit 20).
- Sales by cashier.
- Sales by courier.
- Empty ranges render empty states without errors.

**Acceptance:** each section matches the corresponding reports API endpoint.

### S3 — Cash close

- When the dashboard reports an open shift, load
  `GET /reports/cash-close/:turnoId`.
- Show initial float, expected cash (or hidden), cash and electronic payments,
  and the shift header.
- When there is no open shift, show an empty state.

**Acceptance:** the open shift summary is visible and consistent with the cash
page.

### S4 — CSV exports

- `reporte.exportar` enables the sales CSV download.
- The cash-close card can download its CSV.
- The browser receives the API filename from `Content-Disposition`.

**Acceptance:** downloads are valid CSV files with the expected headers.

## Tasks

- **T1** — Extend `ReportsApi` with breakdowns, cash close, and downloads. `S1`–`S4`. Done.
- **T2** — Reports page with range, KPIs, tables, and cash close. `S1`–`S3`. Done.
- **T3** — CSV download UX. `S4`. Done.
- **T4** — Build and HTTP verification. Done.
- **T5** — Commit. Done.

## Log

### L1 — User request

"vamos a mergear y seguimos, probamos nuevamente el flujo cuando este terminado todo"

Merged `feat/frontend-foundation` into `main` at `ed98e09` and pushed. Started
`feat/admin-operations` for the remaining admin screens.

### L2 — Decisions

- Reports page uses the existing reports API; no backend changes.
- The cash-close card targets the open shift exposed by the dashboard; a shift
  history selector is a later improvement.
- CSV downloads parse the API `Content-Disposition` filename and trigger a
  browser download.

### L3 — Verification

- `corepack pnpm nx build admin` passes.
- `/reports` serves with 200.
- Reports API through the admin proxy returned:
  - 4 channels, 5 top products, 1 cashier, 0 couriers for the current range.
  - Cash close for the open shift with all summary fields.
  - Sales CSV with `text/csv` and the expected headers.
- No browser was available; validation was build + HTTP.

Commit: `61b6891` (`feat(admin): add reports page and CSV exports`).
