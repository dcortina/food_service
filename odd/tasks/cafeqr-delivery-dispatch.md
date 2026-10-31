# CaféQR Cuba — Delivery Dispatch and Liquidation UI

- **Objective:** Close the delivery loop with UI for assigning couriers from the
  POS and closing courier liquidations from the admin.
- **Branch:** `feat/frontend-foundation` (same branch)
- **Delivery strategy:** `ask-on-risk`
- **Test runner:** `corepack pnpm nx build api`, `admin`, `pos`, plus HTTP smoke
  tests.
- **Status:** In progress — verification and commit.

## Specs

### S1 — Pending liquidations API

- `GET /api/v1/delivery/liquidations/pending` returns pending delivered
  assignments grouped by courier, with total cash and orders.
- Requires `repartidor.liquidar` (owner/manager).
- Existing courier list and liquidation closure endpoints are reused.

**Acceptance:** an owner can see each courier's pending cash and close it.

### S2 — Admin Repartidores page

- `/couriers` lists active couriers with vehicle, pending cash, and pending order
  count.
- Pending couriers expose **Liquidar**, which opens a modal with the delivered
  orders and an input for the cash handed to the cashier.
- Closing calls `POST /api/v1/delivery/liquidations` and refreshes the page.
- The nav item is visible with `repartidor.liquidar`.

**Acceptance:** the owner sees the pending `Repartidor Demo` amount and can close
it; the result reports total collected, delivered, and difference.

### S3 — POS courier assignment

- Delivery orders in the POS expose **Asignar** when the user has
  `repartidor.asignar` and the order is confirmed/preparing/ready.
- The dialog lists active couriers and assigns through
  `POST /api/v1/delivery/orders/:id/assign`.
- The cashier role now includes `repartidor.ver` and `repartidor.asignar` in the
  seed; the current local database was updated for immediate testing.

**Acceptance:** a cashier can assign a delivery order and the courier sees it in
the delivery app.

### S4 — Verification

- API, admin, and POS builds pass.
- Cashier permissions include `repartidor.asignar` after re-login.
- Pending endpoint returned `Repartidor Demo` with 123.00.
- Dispatch smoke test delivered `#010` and `#011`; `#010` was liquidated with
  zero difference, leaving `#011` pending for UI review.
- Admin `/couriers` and POS `/orders` serve correctly.
- No browser click-through was possible; validation was build + HTTP.

## Tasks

- **T1** — Pending liquidations API and client types. `S1`. Done.
- **T2** — Admin Repartidores page and nav. `S2`. Done.
- **T3** — POS assignment dialog and cashier permission. `S3`. Done.
- **T4** — Build and smoke test. `S4`. Done.
- **T5** — Commit. `S1`–`S4`. In progress.

## Log

### L1 — User request

"lo veo bien podemos continuar"

Continue with the remaining UI for delivery dispatch and liquidation.

### L2 — Decisions

- Put courier assignment in POS → Pedidos because that is where the order board
  lives.
- Put liquidation closure in a new admin **Repartidores** page for
  owner/manager.
- Add `repartidor.ver` and `repartidor.asignar` to the cashier role in the seed
  and apply the two role-permission rows to the current local database; the
  cashier must log out/in for the new token permissions.
- Keep liquidation closure restricted to `repartidor.liquidar`; the courier app
  remains read-only for liquidation.

### L3 — Verification

- Builds pass for API, admin, and POS.
- `GET /delivery/liquidations/pending` returned `Repartidor Demo` with 123.00
  after the dispatch smoke test.
- The dispatch smoke test created and delivered orders `#010` and `#011`; `#010`
  was liquidated with 0.00 difference, leaving `#011` pending for the admin UI.
- Cashier token reports `repartidor.asignar`.
- Admin `/couriers` and POS `/orders` serve with 200.
- Test data: order `#004` remains active and ready for the delivery app; pending
  liquidation of 123.00 remains for the admin page.

Commit: pending.
