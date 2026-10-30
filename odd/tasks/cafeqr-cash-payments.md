# CaféQR Cuba — Cash and Payments

- **Objective:** Implement cash shifts, movements, cash and electronic payments,
  verification, reconciliation, voiding, order payment state, and audit/outbox.
- **Branch:** `feat/cash-payments` (based on `main` at `7f5c4fd`)
- **Delivery strategy:** `ask-on-risk`
- **Test runner:** HTTP verification with `curl`.
- **Status:** In progress

## Specs

### S1 — Cash shift open and close

- `POST /api/v1/cash/shifts/open` opens a shift for a cash register with an opening
  float and optional denomination breakdown.
- `GET /api/v1/cash/shifts/current` returns the cashier's open shift.
- `GET /api/v1/cash/shifts` lists shifts with pagination and filters.
- `GET /api/v1/cash/shifts/:id` returns the shift with movements, payments, and
  denominations.
- `POST /api/v1/cash/shifts/:id/close` closes the shift with the counted cash,
  calculates expected cash and the difference, and stores the final denominations.
- One open shift per cash register; a second open returns `409`.
- Permissions: `caja.ver`, `caja.abrir`, `caja.cerrar`.

**Acceptance:** open a shift with `500.00`, register payments, close with counted cash,
and verify the expected/difference and final denomination rows.

### S2 — Cash movements

- `POST /api/v1/cash/shifts/:id/movements` registers `ingreso`, `retiro`,
  `gasto_menor`, `devolucion_efectivo`, `propina_efectivo`, or `ajuste`.
- The stored `monto` is signed according to the movement type.
- `retiro` requires `caja.retiro`; the other types require `caja.movimiento`.
- Movements are only allowed on an open shift.
- Permission: `caja.movimiento`.

**Acceptance:** a `retiro` of `100.00` reduces expected cash by `100.00`; the movement
is audited.

### S3 — Payments

- `POST /api/v1/payments` registers a payment for an order.
- Methods: `efectivo`, `transfermovil`, `enzona`.
- Cash payments are created `verificado`; electronic payments are created `registrado`.
- Cash requires `montoRecibido >= monto` and calculates `cambio`.
- A payment requires an open shift and is linked to it.
- Partial payments are allowed; overpayment beyond the order total is rejected.
- Idempotency: the same key returns the existing payment.
- Permission: `pago.registrar`.

**Acceptance:** pay a `280.00` order with `500.00` cash; change is `220.00`; the order
becomes `pagado`; the payment appears in the shift.

### S4 — Verification, reconciliation, and voiding

- `POST /api/v1/payments/:id/verify` moves an electronic payment from `registrado` to
  `verificado` and recalculates the order payment state.
- `POST /api/v1/payments/:id/reconcile` moves an electronic `verificado` payment to
  `conciliado` with the reconciling user.
- `POST /api/v1/payments/:id/void` cancels a payment with a reason and recalculates the
  order payment state.
- Permissions: `pago.registrar`, `pago.conciliar`, `pago.anular`.

**Acceptance:** an EnZona payment stays `registrado` until verified; reconciliation
marks it `conciliado`; voiding returns the order to `parcial` or `pendiente`.

### S5 — Order payment state

- The order payment state is derived from verified/conciliated payments:
  `pendiente`, `parcial`, `pagado`.
- `pagadoEn` is set when the order becomes fully paid and cleared when it is no longer
  fully paid.

**Acceptance:** two partial payments move the order `pendiente → parcial → pagado`.

### S6 — Shift summary and blind count

- The shift detail exposes expected cash, reported electronic, and conciliated electronic.
- If `arqueo_ciego` is true, expected cash is hidden while the shift is open and revealed
  on close.
- The close response includes `efectivoEsperado`, `efectivoContado`, `descuadre`,
  `totalElectronicoReportado`, and `totalElectronicoConciliado`.

**Acceptance:** with blind count enabled, the open shift hides expected cash; closing
reveals it.

### S7 — Audit and outbox

- Actions: `caja.abrir`, `caja.cerrar`, `caja.movimiento`, `pago.registrar`,
  `pago.verificar`, `pago.conciliar`, `pago.anular`.
- Outbox events: `caja.abierta`, `caja.cerrada`, `caja.movimiento`, `pago.registrado`,
  `pago.verificado`, `pago.conciliado`, `pago.anulado`.

**Acceptance:** `log_auditoria` and `outbox_event` contain the expected rows.

### S8 — Verification

- `pnpm nx run-many -t build` passes.
- The curl flow for open, payments, verify, reconcile, movement, close, permissions,
  and idempotency passes.

## Tasks

| ID | Task | Specs | Route | Status |
| --- | --- | --- | --- | --- |
| T1 | Create the feature document and branch | — | inline | done |
| T2 | Implement cash and payment DTOs | S1–S6 | inline | done |
| T3 | Implement `CashService` open/close/movements | S1, S2, S6 | inline | done |
| T4 | Implement `PaymentsService` register/verify/reconcile/void | S3–S5 | inline | done |
| T5 | Implement order payment state recalculation | S5 | inline | done |
| T6 | Implement `CashController` and `PaymentsController` | S1–S4 | inline | done |
| T7 | Wire `CashModule` and `AppModule` | — | inline | done |
| T8 | Implement audit and outbox hooks | S7 | inline | done |
| T9 | Verify the cash flow with curl | S1–S5 | inline | done |
| T10 | Verify reconciliation, voiding, permissions, and idempotency | S4, S8 | inline | done |
| T11 | Update docs and commit the work unit | S8 | inline | done |

## Log

### L1 — Request

> si :)

The product owner authorized the cash and payments slice.

### L2 — Scope notes

- The shift belongs to the cashier and a physical cash register; one open shift per
  register.
- Cash payments are verified immediately; electronic payments require cashier
  verification and later bank reconciliation.
- The expected cash formula is opening float + verified cash payments + signed cash
  movements.
- The PIN authorization guard for withdrawals is deferred; the permission check is
  enforced.
- The print agent and receipt printing remain a separate slice.

### L3 — Verification (2026-10-30)

- `pnpm nx build api` and the full workspace build pass.
- Opened shift `#1` with `500.00` and five `100.00` denominations; a second open on the
  same register returns 409.
- Cash payment for a `280.00` order with `500.00` received: change `220.00`, payment
  `verificado`, order `pagado`, `pagadoEn` set.
- A `retiro` of `100.00` with the owner as authorizer stores `-100.00`; expected cash
  moves from `780.00` to `680.00`.
- Electronic Transfermóvil payment `280.00` starts `registrado` and the order stays
  `pendiente`; cashier verification moves it to `verificado` and the order to `pagado`;
  the cashier receives 403 on reconciliation and the owner reconciles to `conciliado`.
- Close with `680.00` counted: expected `680.00`, difference `0.00`, reported
  electronic `280.00`, conciliated `280.00`, and the final denominations are returned.
- Blind count enabled: the cashier sees `efectivoEsperado: null` while open; the owner
  sees `500.00`; closing reveals `500.00`.
- Payment idempotency returns the same payment id for the same key.
- Cashier void returns 403; owner void returns 200, payment `anulado`, order returns to
  `pendiente`.
- Kitchen open shift and payment attempts return 403.
- Audit: 3 `caja.abrir`, 3 `caja.cerrar`, 1 `caja.movimiento`, 4 `pago.registrar`,
  1 `pago.verificar`, 1 `pago.conciliar`, 1 `pago.anular`.
- Outbox: matching `caja.*` and `pago.*` events.
- Fixed during verification: the nested order in the payment response had a stale
  `estadoPago` and a `total` without two decimals; the service now re-fetches the
  payment after the transaction and formats the nested total. The close response did
  not include the final denominations because the shift was read before creating them;
  it now re-fetches the shift after creating the final rows.
- The seed now removes stale role-permission links and the cashier no longer has
  `pago.conciliar` or `pago.anular`.
