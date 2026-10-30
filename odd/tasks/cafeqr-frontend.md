# CaféQR Cuba — Frontend Foundation and Admin Dashboard

- **Objective:** Deliver the first professional Angular slice: shared API/auth
  libraries, Tailwind design baseline, login, application shell, and a live
  admin dashboard backed by `/api/v1/reports/dashboard`.
- **Branch:** `feat/frontend-foundation` (based on `main` at `7f0b2ff`)
- **Delivery strategy:** `ask-on-risk`
- **Test runner:** `pnpm nx build admin` plus HTTP smoke checks through the dev proxy.
- **Status:** In progress

## Specs

### S1 — Shared API client and auth libraries

- `@cafeqr/api-client` exposes typed `AuthApi` and `ReportsApi` services using
  relative `/api/v1/...` URLs.
- `@cafeqr/auth` exposes `AuthService`, `authInterceptor`, and `authGuard`.
- The auth service persists access token, refresh token, and user in
  `localStorage`, exposes signals for the current user and session, and supports
  login, refresh, logout, and permission checks.
- The interceptor attaches the bearer token to `/api` requests, refreshes once
  on `401`, retries the request, and clears the session when refresh fails.

**Acceptance:** both libraries compile inside the admin build and can be reused
by the future POS, KDS, menu, and delivery apps.

### S2 — Login

- Route `/login` renders a branded card with username and password fields.
- Invalid credentials show a clear error message without losing the form.
- Successful login stores the session and navigates to `/dashboard`.
- An existing session visiting `/login` is redirected to `/dashboard`.
- Demo credentials are shown as a hint.

**Acceptance:** `owner` / `CafeQR123!` logs in against the local API through the
Angular dev proxy.

### S3 — Application shell

- Authenticated routes render a responsive sidebar with Dashboard, Pedidos,
  Catálogo, Mesas y QR, Caja, Pagos, Usuarios, Reportes, and Configuración.
- The top bar shows the business/branch, current user, role, and logout.
- Unauthenticated access to a protected route redirects to `/login`.
- Unimplemented modules render a consistent "module in progress" page instead
  of a broken route.

**Acceptance:** deep links such as `/dashboard` and `/cash` are protected and
render inside the shell; logout returns to `/login`.

### S4 — Admin dashboard

- `/dashboard` consumes `GET /api/v1/reports/dashboard`.
- A date range (`desde`, `hasta`) can be applied and reloads the report.
- KPI cards show total sales, paid orders, average ticket, and active orders.
- The page shows sales by channel, payment method, hour, top products, sales by
  cashier/courier, open cash shift, and latest orders.
- Loading skeletons and a retryable error state are present.
- Money is formatted with two decimals; dates use a short local format.

**Acceptance:** with seeded data the owner sees today's sales, breakdowns, top
products, and latest orders; an empty range renders zeros and empty states
without crashing.

### S5 — Styling and local development

- Tailwind CSS 4 is wired through PostCSS for the admin app.
- The dev server proxies `/api` to `http://localhost:3000`.
- The production build completes within the existing Angular budgets.

**Acceptance:** `pnpm nx build admin` passes and `curl` against the dev server
proxies `/api/v1/health/live` successfully.

## Tasks

- **T1** — Shared API client library. `S1`. Inline. Done.
- **T2** — Shared auth library. `S1`. Inline. Done.
- **T3** — Tailwind/PostCSS, proxy, and app configuration. `S5`. Inline. Done.
- **T4** — Login, shell, routing, and placeholder pages. `S2`, `S3`. Inline. Done.
- **T5** — Dashboard store, page, and report visualizations. `S4`. Inline. Done.
- **T6** — Build, smoke test, and fix. `S1`–`S5`. Inline. Done.
- **T7** — Work-unit commit. `S1`–`S5`. Inline. Done.

## Log

### L1 — User request

"si has la mezcla y el push y luego pasamos al fronted"

Merged `feat/reports-dashboard` (`7f0b2ff`) into `main` with a fast-forward and
pushed `origin/main`. Proceeding with the first frontend slice.

### L2 — Slice decision

Start with the admin application because it consumes the reports API that was
just delivered. Reusable API/auth libraries are built first so POS, KDS, menu,
and delivery can share the same session and HTTP behavior.

### L3 — Verification

- `pnpm nx build admin --skip-nx-cache` passes; production bundle is about
  300 kB initial, 78 kB transfer.
- Tailwind utilities are present in the emitted `styles-*.css`.
- The dev server on port 4200 serves the SPA and deep links.
- The dev proxy forwards `/api/v1/health/live` and `/api/v1/auth/login` to the
  API; the seeded owner logs in successfully.
- `GET /api/v1/reports/dashboard` returns the exact fields consumed by the
  dashboard types, including the open-shift and latest-orders shapes.

Note: the local environment defines `PORT=3000`, so the admin dev server must be
started with `pnpm nx serve admin --port 4200` (or `PORT=4200`) to avoid a port
collision with the API.

### L4 — Work-unit commit

The frontend foundation and dashboard are committed as `f4e4adb`
(`feat(admin): add frontend foundation and dashboard`) on
`feat/frontend-foundation`. The branch is intentionally not merged or pushed yet;
the user reviews the admin app first.
