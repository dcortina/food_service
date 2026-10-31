# CaféQR Cuba — KDS Frontend

- **Objective:** Deliver the kitchen display: live tickets, per-item preparation
  states, order-ready actions, and a realtime connection.
- **Branch:** `feat/frontend-foundation` (same branch, no new branch)
- **Delivery strategy:** `ask-on-risk`
- **Test runner:** `corepack pnpm nx build kds` plus HTTP and Socket.IO smoke
  tests.
- **Status:** In progress — verification and commit.

## Specs

### S1 — KDS authentication and shell

- `/login` authenticates with the existing JWT/refresh flow and dynamic branding.
- The shell shows the brand, kitchen label, live connection indicator, clock,
  user, and logout.
- The KDS uses the shared `@cafeqr/ui`, `@cafeqr/config`, and `@cafeqr/auth`
  libraries.

**Acceptance:** the `cocina` user logs in and sees the kitchen shell.

### S2 — Kitchen board

- `/board` loads `GET /api/v1/kds/orders`.
- Orders are grouped into Por iniciar (`confirmado`), En preparación
  (`en_preparacion`), and Listos (`listo`).
- Each ticket shows the order code, table/channel, item count, created time,
  elapsed minutes, items, modifiers, and kitchen notes.
- Elapsed time is color-coded: green under 5 minutes, mustard from 5 to 9, red
  from 10.

**Acceptance:** confirmed, preparing, and ready orders appear in the correct
columns.

### S3 — Kitchen actions

- A pending item can be started (`en_preparacion`).
- An item in preparation can be marked ready (`listo`).
- The order can be marked all-ready when not every item is ready.
- Buttons are disabled while their request is in flight; errors are shown.

**Acceptance:** marking every item ready moves the order to Listos; the
all-ready button is hidden once every item is ready.

### S4 — Realtime

- The KDS connects to the Socket.IO `/realtime` namespace with the access token.
- `pedido.creado`, `pedido.actualizado`, and `pedido.item.actualizado` trigger a
  debounced board reload.
- The shell shows En vivo when connected and Reconectando otherwise.
- The dev server proxies `/socket.io` with WebSocket support.

**Acceptance:** a new POS order appears in the KDS without a manual refresh; an
item update is reflected in the board.

### S5 — Local development

- Tailwind/PostCSS and the `/api` proxy are configured for the KDS app.
- The KDS runs on port 4202.

**Acceptance:** `corepack pnpm nx build kds` passes and the dev proxy reaches the
API and realtime namespace.

## Tasks

- **T1** — KDS app shell, login, and Tailwind/proxy. `S1`, `S5`. Done.
- **T2** — Kitchen board columns and tickets. `S2`. Done.
- **T3** — Item and order actions. `S3`. Done.
- **T4** — Socket.IO realtime service and live indicator. `S4`. Done.
- **T5** — Build and smoke test. `S1`–`S5`. Done.
- **T6** — Commit. `S1`–`S5`. In progress.

## Log

### L1 — User request

"no crea una rama nueva para el kds"

Continue the KDS on `feat/frontend-foundation`; no new branch.

### L2 — Decisions

- Three-column kitchen board (Por iniciar, En preparación, Listos) with
  high-contrast tickets on a dark kitchen background.
- Per-item transitions and an order-level "Marcar todo listo" action.
- Socket.IO for live updates, with a debounced reload and manual refresh
  fallback.
- Keep the POS/admin branding and auth shared; no backend changes were needed.

### L3 — Verification

- `corepack pnpm nx build kds --skip-nx-cache` passes; initial bundle is about
  297 kB (75 kB transfer).
- HTTP smoke test as `cocina`:
  - Loaded 10 active KDS orders.
  - Created and confirmed test order `#019`.
  - Started its item (`en_preparacion`) and marked it ready (`listo`).
  - The order automatically moved to `listo`; a subsequent all-ready call
    returned `409`, which is expected because the order was already ready and
    the UI hides that button.
- Socket.IO smoke test connected through the KDS dev proxy on port 4202 and
  received `pedido.creado`, `pedido.actualizado`, and
  `pedido.item.actualizado` events for `#019`.
- The smoke test left order `#019` in `listo` in the local demo database.

Commit: pending.
