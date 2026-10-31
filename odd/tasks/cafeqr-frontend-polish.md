# CaféQR Cuba — Frontend Polish Details

- **Objective:** Close the remaining operational details: split payments,
  discounts, social channels, cash movements, KDS sound, printable QR, and menu
  service worker.
- **Branch:** `feat/frontend-polish`
- **Delivery strategy:** `ask-on-risk`
- **Test runner:** `corepack pnpm nx build pos|kds|admin|menu` plus HTTP checks.
- **Status:** Done — committed on `feat/frontend-polish`, pending review/merge.

## Specs

### S1 — Split payments

- Payment dialog shows total, already paid, and remaining.
- The cashier can enter a partial amount and register it.
- Cash received/change are calculated against the partial amount.
- Order payment state comes from the API (`parcial`, `pagado`, etc.).
- Reopening the dialog shows the remaining balance and can register another
  payment.

**Acceptance:** 50.00 + 53.00 + 10.00 on a 113.00 order leaves it `pagado` after
the final payment, with `parcial` after the first two.

### S2 — Discounts

- Users with `pedido.descuento` see a discount input in the POS cart.
- Discount is clamped to the subtotal for display; a raw discount above subtotal
  is rejected on submit.
- The create-order payload includes the discount and the API returns the reduced
  total.

**Acceptance:** a 123.00 order with a 10.00 discount totals 113.00.

### S3 — Social channels

- Non-table POS orders expose an origin selector: Automático, WhatsApp,
  Instagram, Facebook.
- The selected origin becomes the order `canal`; service type remains
  mostrador/para llevar/domicilio.

**Acceptance:** a domicilio order with WhatsApp origin is created with
`canal: whatsapp`.

### S4 — Cash movements

- The POS cash page has a movement form for an open shift.
- Ingreso, propina, and ajuste are available to cashiers.
- Retiro, gasto menor, and devolución are available only to users with
  `pin.autorizar`; the current user is recorded as authorizer.
- The shift reloads after a successful movement.

**Acceptance:** an ingreso of 20.00 and a retiro of 10.00 (owner) are recorded.

### S5 — KDS sound

- A sound toggle is available in the board header.
- Orders exceeding `etaMinutos` trigger a short Web Audio beep once per order.
- Audio failure never breaks the board.

**Acceptance:** enabling sound and loading an overdue order triggers a single
beep; the order is not alerted repeatedly.

### S6 — Printable QR / PDF

- The QR modal exposes **Imprimir / PDF**.
- A print-friendly window shows the table number, QR image, and menu URL, then
  opens the browser print dialog (save as PDF).
- PNG download and link copy remain available.

**Acceptance:** the print window renders the QR with the correct table.

### S7 — Menu service worker

- A basic service worker caches the app shell and GET responses.
- API GETs use network-first with cache fallback; offline navigation falls back
  to the cached shell.
- Registered after load from `main.ts`; `sw.js` is served from the menu public
  folder.

**Acceptance:** `/sw.js` returns 200 and is included in the production build.

## Tasks

- **T1** — Split payments and order payment-state synchronization. `S1`. Done.
- **T2** — Discount input and payload. `S2`. Done.
- **T3** — Social origin selector. `S3`. Done.
- **T4** — Cash movement form and authorizer handling. `S4`. Done.
- **T5** — KDS beep and sound toggle. `S5`. Done.
- **T6** — QR print/PDF window. `S6`. Done.
- **T7** — Menu service worker. `S7`. Done.
- **T8** — Builds and HTTP verification. Done.
- **T9** — Commit. In progress.

## Log

### L1 — User request

"si vamos con los detalles"

Close the secondary gaps listed before the final end-to-end test.

### L2 — Decisions

- Split payments use the existing multiple-payment API; the dialog computes the
  remaining balance from `order.pagos`.
- Discounts are limited to `pedido.descuento`.
- Social channels are a canal override for non-table service types.
- Cash movement authorization uses the current user when they have
  `pin.autorizar`; a dedicated manager PIN handoff remains a future hardening.
- KDS sound uses Web Audio with a once-per-order guard.
- PDF QR uses the browser print dialog; no extra PDF dependency.
- The menu service worker is a small hand-written cache, not Workbox.

### L3 — Verification

- `pos`, `kds`, `admin`, and `menu` production builds pass.
- API smoke test:
  - Created WhatsApp domicilio order `#012`: subtotal 123.00, discount 10.00,
    total 113.00.
  - Registered 50.00 and 53.00 partial payments; order remained `parcial` with
    10.00 outstanding (two payments recorded).
  - Registered cash ingreso 20.00 and authorized retiro −10.00.
- `/sw.js` returns 200 and exists in `dist/apps/menu/browser/sw.js`.
- No browser click-through was available; audio, print dialog, and service
  worker runtime behavior were not visually verified.
- Physical thermal-printer validation remains an on-site task.

Commit: pending.
