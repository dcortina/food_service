# CaféQR Cuba — Reports and Dashboard

- **Objective:** Implement the dashboard summary, sales breakdowns, cash-close report,
  and CSV exports.
- **Branch:** `feat/reports-dashboard` (based on `main` at `89a192a`)
- **Delivery strategy:** `ask-on-risk`
- **Test runner:** HTTP verification with `curl`.
- **Status:** In progress

## Specs

### S1 — Dashboard summary

- `GET /api/v1/reports/dashboard` returns:
  - Total sales, paid orders, average ticket, active orders.
  - Sales by channel.
  - Sales by payment method.
  - Sales by hour.
  - Top products.
  - Sales by cashier and by courier.
  - Open cash shift summary.
  - Latest orders.
- Default range: the current business day; `desde` and `hasta` accept `YYYY-MM-DD`.
- Money is returned as strings with two decimals.
- Permission: `reporte.ver`.

**Acceptance:** the owner sees today's sales, methods, top products, and the open shift;
a range with no data returns zeros and empty arrays.

### S2 — Sales breakdowns

- `GET /api/v1/reports/sales/by-channel`.
- `GET /api/v1/reports/sales/by-product` with a `limit` (default 10, max 50).
- `GET /api/v1/reports/sales/by-cashier`.
- `GET /api/v1/reports/sales/by-courier`.
- All accept `desde` and `hasta`.
- Permission: `reporte.ver`.

**Acceptance:** each endpoint returns the same aggregate shown on the dashboard for the
same range.

### S3 — Cash-close report

- `GET /api/v1/reports/cash-close/:turnoId` returns the shift detail plus a summary:
  opening float, expected cash, counted cash, difference, reported electronic,
  conciliated electronic, cash payments, and electronic payments.
- Permission: `reporte.ver`.

**Acceptance:** a closed shift report shows the same totals as the shift detail.

### S4 — CSV exports

- `GET /api/v1/reports/export/sales.csv` exports paid orders in the range.
- `GET /api/v1/reports/export/cash-close/:turnoId.csv` exports the payments and
  movements of the shift.
- Responses use `text/csv; charset=utf-8` and an attachment filename.
- Permission: `reporte.exportar`.

**Acceptance:** the owner downloads a valid CSV; the cashier receives 403.

### S5 — Date range and tenancy

- `desde`/`hasta` are `YYYY-MM-DD`; `desde <= hasta`; the range is at most 366 days.
- Invalid ranges return 400.
- All queries are scoped to the token's `negocioId` and `sucursalId`.

**Acceptance:** a range from another branch or an inverted range is rejected/empty.

### S6 — Verification

- `pnpm nx run-many -t build` passes.
- The dashboard, breakdowns, cash-close, CSV, permissions, and invalid range flows pass.

## Tasks

| ID | Task | Specs | Route | Status |
| --- | --- | --- | --- | --- |
| T1 | Create the feature document and branch | — | inline | done |
| T2 | Implement report DTOs and range resolution | S1, S5 | inline | done |
| T3 | Implement the dashboard aggregate service | S1, S2 | inline | done |
| T4 | Implement the cash-close report | S3 | inline | done |
| T5 | Implement CSV exports | S4 | inline | done |
| T6 | Implement the reports controller and module | S1–S5 | inline | done |
| T7 | Wire `ReportsModule` and export `CashService` | — | inline | done |
| T8 | Verify dashboard, breakdowns, cash close, CSV, and permissions | S6 | inline | done |
| T9 | Update docs and commit the work unit | S6 | inline | done |

## Log

### L1 — Request

> si crear los reportes/dashboard

The product owner authorized the reports and dashboard slice.

### L2 — Scope notes

- The dashboard uses paid orders for sales and verified/conciliated payments for the
  method and cashier breakdowns.
- The business day is the default range; the business timezone is used for hourly
  grouping.
- CSV is implemented in this slice; PDF can be added later without changing the
  aggregate contract.
- The admin UI will consume these endpoints in the frontend slice.

### L3 — Verification (2026-10-30)

- `pnpm nx build api` passes and the API maps all report routes.
- Dashboard for 2026-10-30: sales `840.00`, 3 paid orders, average ticket `280.00`,
  9 active orders; channel `mostrador` 3 / `840.00`; methods cash 2 / `560.00` and
  Transfermóvil 1 / `280.00`; top product Café con leche 3 / `840.00`; cashier
  Cajero Demo 3 / `840.00`; no courier sales; no open shift; latest orders returned.
- `by-channel`, `by-product`, `by-cashier`, and `by-courier` return the same aggregates.
- Cash close for the latest closed shift: opening float `500.00`, expected `500.00`,
  counted `500.00`, difference `0.00`; the shift contains one annulled payment, so cash
  and electronic totals are `0.00`.
- `export/sales.csv` returns `text/csv; charset=utf-8` and an attachment filename with
  the expected headers and paid-order rows.
- `export/cash-close/:turnoId.csv` returns the payment/movement rows; dates are ISO
  strings after the formatting fix.
- Cashier can read the dashboard (200) but receives 403 on CSV export.
- An inverted date range returns 400.
- PDF export is deferred; CSV is the implemented export in this slice.
