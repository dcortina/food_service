# CaféQR Cuba — Frontend Foundation and Admin Dashboard

- **Objective:** Deliver the first professional Angular slice: shared API/auth
  libraries, Tailwind design baseline, login, application shell, and a live
  admin dashboard backed by `/api/v1/reports/dashboard`.
- **Branch:** `feat/frontend-foundation` (based on `main` at `7f0b2ff`)
- **Delivery strategy:** `ask-on-risk`
- **Test runner:** `pnpm nx build admin` plus HTTP smoke checks through the dev proxy.
- **Status:** Done — committed on `feat/frontend-foundation`, pending review/merge.

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

### S6 — Dynamic business branding

- `GET /api/v1/public/branding` returns the active business name and logo for
  the pre-authentication login screen.
- `GET /api/v1/settings/business` and `PATCH /api/v1/settings/business` allow a
  user with `configuracion.gestionar` to read and update the business name and
  logo.
- The login response includes `negocio.logoUrl`.
- The admin settings page edits the name and logo (public URL or an image up to
  48 KB), previews the result, and applies it immediately to the sidebar, login,
  and browser tab title.
- The logo falls back to a burger mark when unset.
- Settings changes are audited.

**Acceptance:** changing the name/logo in Configuración updates the public
branding, the authenticated shell, and the login page; a user without the
permission sees a restricted state and receives `403` from the API.

### S7 — Food-service visual refresh

- Warm fast-food palette: tomato red, mustard, cream, charcoal, lettuce.
- Cream dotted background, dark charcoal sidebar, bold display typography,
  rounded cards, and a burger illustration on the login screen.
- Dashboard, login, shell, settings, and placeholder pages share the same visual
  language.
- Text remains readable and the layout remains responsive.

**Acceptance:** the admin app feels like a modern fast-casual ordering product,
not a generic dashboard, without sacrificing clarity or accessibility.

## Tasks

- **T1** — Shared API client library. `S1`. Inline. Done.
- **T2** — Shared auth library. `S1`. Inline. Done.
- **T3** — Tailwind/PostCSS, proxy, and app configuration. `S5`. Inline. Done.
- **T4** — Login, shell, routing, and placeholder pages. `S2`, `S3`. Inline. Done.
- **T5** — Dashboard store, page, and report visualizations. `S4`. Inline. Done.
- **T6** — Build, smoke test, and fix. `S1`–`S5`. Inline. Done.
- **T7** — Work-unit commit. `S1`–`S5`. Inline. Done.
- **T8** — Settings/branding API and auth logo payload. `S6`. Inline. Done.
- **T9** — Branding service, dynamic login/shell/tab title. `S6`. Inline. Done.
- **T10** — Settings page with name, URL, upload, and preview. `S6`. Inline. Done.
- **T11** — Food-service visual refresh. `S7`. Inline. Done.
- **T12** — Build, API smoke test, and commit. `S6`, `S7`. Inline. Done.

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

### L5 — User feedback: dynamic brand and food-service theme

"tengo algunos puntos que quiero tocar en el fronted. 1 El nombre todavia esta
sujeto a cambios por lo que seria bueno que sea dinamico poder establecerlo en la
configuracion al igual que el logo. 2 EN cuanto a la tematica o diseño me
gustaria que fuera un diseño fresco ambientado principalmente al sector de la
comida, servicio de pedidos comida rapida hambuergeseria algo asi. Lo dejo a tu
imaginacion."

Decision: keep the existing `Negocio.nombre`/`logoUrl` columns (no migration),
add a protected settings API plus a public branding endpoint, and make the
frontend branding reactive through a root `BrandingService`. The visual refresh
uses a tomato/mustard/cream/charcoal palette, a burger mark, and a dark sidebar
to evoke a fast-casual burger restaurant.

### L6 — Verification

- `pnpm nx build api` passes; the API was restarted from `dist`.
- `PATCH /api/v1/settings/business` updates the name and logo; the public
  branding and the login response reflect both changes.
- `GET /api/v1/settings/business` is protected: the owner receives `200` and the
  cashier receives `403`.
- `pnpm nx build admin` passes: about 304 kB initial and 79 kB transfer.
- The dev proxy serves `/api/v1/public/branding` and the settings endpoint.
- No browser was available in this environment, so the UI was verified through
  the production build and HTTP contracts, not a click-through.

Commit: `fdca83a` (`feat(admin): add dynamic branding and food-service theme`).

### L7 — Sidebar hover contrast fix

"lo unico que note es el hover del side menu que es de un colo amarillento y
las letras de un colo de tono blanco por lo que no se distinguen bien cuando
esta sobre el hover amarillo"

The active item kept white text when hovered over the mustard background.
Replaced the conflicting Tailwind hover utilities with explicit `.nav-link`
states: inactive hover uses a subtle white overlay and white text; active hover
uses mustard-300 with charcoal text. Commit `c1ac4b4`.
