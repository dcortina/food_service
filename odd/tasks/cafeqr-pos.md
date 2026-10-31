# CaféQR Cuba — POS Frontend

- **Objective:** Deliver the cashier workspace: login, order assembly, order
  board, cash shift control, and payment capture.
- **Branch:** `feat/frontend-foundation` (continues the frontend branch)
- **Delivery strategy:** `ask-on-risk`
- **Test runner:** `corepack pnpm nx build pos` plus HTTP smoke tests through the
  POS dev proxy.
- **Status:** In progress — verification and commit.

## Specs

### S1 — POS authentication, shell, and shared branding

- `/login` authenticates with the existing JWT/refresh flow and dynamic business
  branding.
- The authenticated shell shows the brand, branch, cashier, and tabs for Nuevo
  pedido, Pedidos, and Caja.
- Tabs are filtered by permission.
- The admin and POS apps share `@cafeqr/ui` (brand mark) and `@cafeqr/config`
  (branding service) instead of duplicating them.

**Acceptance:** the cashier logs in, sees only permitted tabs, and the brand
matches the public branding and admin settings.

### S2 — Order assembly

- Service types: mostrador, mesa, para llevar, domicilio.
- Mesa orders require a free table grouped by zone.
- Domicilio orders require customer name, phone, and address.
- Catalog is filtered by category and text search.
- Products with modifier groups open a selection dialog with required/min/max
  validation, quantity, and kitchen notes.
- The cart supports quantity changes, removal, merging identical lines, order
  notes, and a live total.
- Confirming creates the order and immediately confirms it, which triggers KDS
  and the print job.

**Acceptance:** a cashier can build a multi-item order with modifiers, confirm
it, and see the order code and total.

### S3 — Order board and payment

- `/orders` lists recent orders with status, payment state, channel/table, total,
  and time.
- Active/all filters and a manual refresh are available.
- Unpaid orders expose a payment dialog.
- Payment supports cash (received amount and change) and electronic methods
  (reference required, followed by verification).
- If the cashier has no open shift, the dialog offers to open one with an
  initial float.

**Acceptance:** a confirmed order can be paid in cash or electronic; the order
shows `pagado` and the shift records the payment.

### S4 — Cash shift

- `/cash` shows the current shift or an open-shift form.
- Open shift captures the initial float.
- The open shift shows initial float, expected cash (or hidden under blind
  count), reported electronic amount, payments, and movements.
- Closing captures counted cash and observations and displays the resulting
  difference.

**Acceptance:** the cashier opens a shift, sees payments, closes with a count,
and the difference is shown.

### S5 — Local development

- Tailwind/PostCSS and the `/api` proxy are configured for the POS app.
- The POS runs on port 4201.

**Acceptance:** `corepack pnpm nx build pos` passes and the dev proxy reaches the
API.

## Tasks

- **T1** — Shared `@cafeqr/ui` brand mark and `@cafeqr/config` branding service. `S1`. Done.
- **T2** — POS login and shell. `S1`. Done.
- **T3** — Catalog, modifiers, cart, service types, and order confirmation. `S2`. Done.
- **T4** — Orders board and payment dialog. `S3`. Done.
- **T5** — Cash shift open/close. `S4`. Done.
- **T6** — Tailwind/proxy, build, and HTTP smoke test. `S5`. Done.
- **T7** — Commit. `S1`–`S5`. In progress.

## Log

### L1 — User request

"listo perfecto, continuemos"

Continuing the frontend after the admin branding/theme review. The next slice is
the POS workspace because it turns the existing orders, cash, and payments APIs
into the cashier's daily tool.

### L2 — Decisions

- Reuse the admin auth/API layers and extract branding/UI primitives into shared
  libraries.
- Use a top-tab layout instead of the admin sidebar so the catalog gets maximum
  horizontal space.
- Keep the same tomato/mustard/cream/charcoal visual language, with a
  touch-friendly order panel.
- Confirm the order immediately after creation so KDS and printing start without
  an extra manual step.

### L3 — Verification

- `corepack pnpm nx build pos --skip-nx-cache` passes; initial bundle is about
  318 kB (81 kB transfer).
- The POS dev server serves `/`, `/login`, and `/order` on port 4201; the `/api`
  proxy reaches the API.
- HTTP smoke test as `cajero`:
  - Opened a shift with a 100.00 float.
  - Loaded 4 categories and 9 available products.
  - Created and confirmed order `#014` (Café con leche + Mediano, total 280.00).
  - Registered a cash payment with 500.00 received; change 220.00.
  - The order ended as `pagado` / `confirmado`.
- The smoke test left the cajero shift open with one payment in the local demo
  database. This is test data, not part of the seed.

Commit: pending.
