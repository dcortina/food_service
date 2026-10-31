# CaféQR Cuba — Public Menu PWA

- **Objective:** Deliver the customer-facing QR menu: public menu, cart,
  self-ordering, and live order tracking.
- **Branch:** `feat/frontend-foundation` (same branch)
- **Delivery strategy:** `ask-on-risk`
- **Test runner:** `corepack pnpm nx build menu` plus public HTTP smoke tests.
- **Status:** Done — committed on `feat/frontend-foundation`, pending review/merge.

## Specs

### S1 — Landing and QR routing

- `/` explains the QR flow and accepts a QR code or full QR URL.
- `/qr/:codigoQr` loads the menu for that table.
- Invalid or unknown QR codes show a retryable error.

**Acceptance:** pasting a valid table code or URL opens the corresponding menu.

### S2 — Public menu

- Loads `GET /api/v1/public/menu/:codigoQr` without authentication.
- Shows the business name/logo, table number, categories, products, prices,
  availability, and modifier groups.
- Category chips and text search filter the products.
- Products with modifiers open a bottom-sheet selector with required/min/max
  validation, quantity, and notes.

**Acceptance:** the seeded Mesa 1 QR opens “El yumurí” with 4 categories and 9
products; Café con leche exposes its size/modifier options.

### S3 — Cart and self-order

- Cart supports quantity changes, removal, merging identical lines, and notes.
- A sticky cart bar shows the item count and total.
- The cart sheet captures an optional customer name and order notes.
- Submitting calls `POST /api/v1/public/orders` with the table QR, items,
  modifiers, optional customer, notes, and an idempotency key.

**Acceptance:** a public order is created as `nuevo` and appears in the POS
order board for staff confirmation.

### S4 — Order tracking

- After submission, the PWA shows the order code, table, status timeline, ETA,
  items, and total.
- The order is polled every 10 seconds via
  `GET /api/v1/public/orders/:id?codigoQr=...`.
- The last order is stored in `localStorage` per QR so a refresh restores
  tracking.
- “Volver al menú” clears the tracked order and returns to the catalog.

**Acceptance:** the customer sees Recibido → Confirmado → En preparación →
Listo → Entregado as staff advance the order; the tracking survives a refresh.

### S5 — Staff confirmation for QR orders

- `nuevo` orders in the POS board expose a **Confirmar** action when the user has
  `pedido.crear`.
- Confirming calls `POST /api/v1/orders/:id/confirm`, which sends the order to
  the KDS and print queue.

**Acceptance:** a public order confirmed from the POS appears in the KDS.

### S6 — PWA-ready shell

- The menu is mobile-first, installable through a web manifest, and uses the
  shared food-service visual language.
- A web manifest and SVG icon are served.
- A basic service worker caching the shell and GET responses was added in the
  frontend polish slice; ordering still requires network.

**Acceptance:** the manifest and icon load, and the menu remains usable on a
phone viewport.

## Tasks

- **T1** — Public menu/order API client types. `S2`, `S3`, `S4`. Done.
- **T2** — Landing and QR routing. `S1`. Done.
- **T3** — Public menu, product modifiers, and cart. `S2`, `S3`. Done.
- **T4** — Public order submission and tracking. `S3`, `S4`. Done.
- **T5** — POS confirm action for new QR orders. `S5`. Done.
- **T6** — Manifest, build, and HTTP smoke test. `S6`. Done.
- **T7** — Commit. `S1`–`S6`. Done.

## Log

### L1 — User request

"continua perdon problemas de internet"

Continue the frontend after the KDS. The next slice is the customer menu PWA,
which completes the QR self-ordering loop with the POS and KDS.

### L2 — Decisions

- Public menu and public order APIs need no authentication; the menu app does
  not install the auth interceptor.
- QR orders remain `nuevo` until staff confirms them in the POS, matching the
  unified tray flow and preventing unattended orders from reaching the kitchen.
- Tracking uses polling plus `localStorage` per QR code; realtime for customers
  can be added later.
- Add a manifest and SVG icon now; a service worker/offline cache is a later
  hardening step because ordering requires connectivity.

### L3 — Verification

- `corepack pnpm nx build menu --skip-nx-cache` passes; initial bundle is about
  293 kB (74 kB transfer).
- The menu dev server serves `/`, `/qr/:codigoQr`, `manifest.webmanifest`, and
  `icon.svg` on port 4203; `/api` proxies to the API.
- Public menu via the 4203 proxy: “El yumurí”, Mesa 1, 4 categories, 9 products.
- Public smoke test:
  - Created order `#001` with Café con leche + Mediano for 280.00.
  - Public status returned `nuevo` with ETA 6.
  - POS confirmed it and the public status changed to `confirmado`.
  - The KDS list contains the order.
- The public order was left in `confirmado` in the local demo database.
- No browser was available, so the UI was verified through build and HTTP
  contracts, not click-through.

Commit: `046978a` (`feat(menu): add public QR menu and self-ordering`).
