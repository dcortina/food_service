# CaféQR Cuba — Delivery Backend and Courier App

- **Objective:** Deliver the courier workflow: assigned delivery orders, departure,
  delivery with cash collection, and liquidation visibility.
- **Branch:** `feat/frontend-foundation` (same branch)
- **Delivery strategy:** `ask-on-risk`
- **Test runner:** `corepack pnpm nx build api`, `corepack pnpm nx build delivery`,
  plus HTTP smoke tests.
- **Status:** In progress — verification and commit.

## Specs

### S1 — Delivery backend

- `GET /api/v1/delivery/orders` returns the current courier's active assigned
  orders.
- `POST /api/v1/delivery/orders/:id/start` records the departure time.
- `POST /api/v1/delivery/orders/:id/deliver` marks the order delivered and
  records cash collected.
- `GET /api/v1/delivery/liquidations/current` returns the courier's pending
  cash and delivered orders.
- `GET /api/v1/delivery/liquidations` returns the courier's liquidation history.
- `POST /api/v1/delivery/liquidations` closes a courier liquidation (owner
  permission).
- `GET /api/v1/delivery/couriers` lists active couriers for assignment (owner
  permission).
- `POST /api/v1/delivery/orders/:id/assign` assigns a domicilio order to a
  courier (owner permission).

**Acceptance:** a delivery order can be assigned, started, delivered with cash,
and liquidated.

### S2 — Courier authentication and shell

- `/login` authenticates with the existing JWT flow and dynamic branding.
- The shell shows the brand, Reparto label, user, and tabs Mis entregas /
  Liquidación.
- Tabs are permission-filtered.

**Acceptance:** `repartidor` / `CafeQR123!` logs in and sees the courier shell.

### S3 — Assigned orders and delivery actions

- `/orders` lists active assigned orders with customer name, phone, address,
  items, notes, total, and state.
- Addresses open Google Maps and phone numbers use `tel:` links.
- A `listo` order exposes **Salir a entregar**.
- After departure, **Entregar** opens a cash-collection dialog.
- Delivered orders leave the active list; polling refreshes every 20 seconds.

**Acceptance:** the courier can start and complete an assigned order and record
the cash collected.

### S4 — Liquidation visibility

- `/liquidation` shows pending cash, delivered orders, and liquidation history.
- The courier sees the amount to hand to the cashier.
- The courier cannot close the liquidation because the role lacks
  `repartidor.liquidar`; the cashier/owner closes it through the API for now.

**Acceptance:** after delivery, the pending amount appears; after the owner
closes the liquidation, it appears in the history with the difference.

### S5 — Delivery UI and local development

- Tailwind/PostCSS and `/api` proxy are configured for the delivery app.
- The delivery app runs on port 4204.

**Acceptance:** `corepack pnpm nx build delivery` passes and the proxy reaches
the API.

## Tasks

- **T1** — Delivery backend module, DTOs, assignment, start, deliver, and
  liquidation. `S1`. Done.
- **T2** — Delivery API client types. `S1`. Done.
- **T3** — Courier login and shell. `S2`, `S5`. Done.
- **T4** — Assigned orders and delivery actions. `S3`. Done.
- **T5** — Liquidation summary/history. `S4`. Done.
- **T6** — Build and HTTP smoke test. `S1`–`S5`. Done.
- **T7** — Commit. `S1`–`S5`. In progress.

## Log

### L1 — User request

"si"

Continue with the delivery slice after the menu PWA, on the same
`feat/frontend-foundation` branch.

### L2 — Decisions

- Add a dedicated delivery backend module because the existing orders API did
  not expose courier assignments or liquidation.
- Cash collected is stored on the assignment; the order remains payment-pending
  until the cashier registers the payment in the cash flow.
- The courier can start/deliver with `pedido.ver`; assignment and liquidation
  closure require `repartidor.asignar` / `repartidor.liquidar`.
- Assignment and liquidation closure are API-only for this slice; a dispatcher
  and cashier UI are follow-ups.
- The courier app polls every 20 seconds; realtime for couriers is a later
  enhancement.

### L3 — Verification

- `corepack pnpm nx build api` and `corepack pnpm nx build delivery` pass.
- API smoke test:
  - Created delivery order `#003` (Americano, 180.00), confirmed it, and marked
    it ready.
  - Assigned it to `Repartidor Demo`.
  - Courier listed it, registered departure, delivered it with 180.00 cash.
  - Current liquidation showed 180.00 / 1 order.
  - Owner closed the liquidation with 180.00 handed in; difference 0.00,
    state `liquidada`; the courier history shows it.
- A second order `#004` (Café con leche + Mediano, 280.00) was assigned and left
  ready for the courier to review in the app.
- Delivery dev server serves `/`, `/login`, and `/orders` on port 4204; the
  `/api` proxy reaches the API.
- No browser was available, so the UI was verified through build and HTTP
  contracts, not click-through.

Commit: pending.
