# ADR-0003: Domain model v1.1 corrections

- **Status:** Accepted
- **Date:** 2026-10-29
- **Deciders:** Engineering
- **Supersedes:** `modelo-datos.md` v1.0 where noted

## Context

The v1.0 data model is a good starting point, but it contains contradictions and gaps
that would force a migration or a workaround during the MVP. This ADR records the
corrections that the Prisma schema will implement. The root `modelo-datos.md` remains
as the product-level reference; the Prisma schema is the implementation source of
truth.

## Decisions

### 1. Add `sucursal` (branch)

`negocio` is the tenant; a business can have one or more branches. Add `Sucursal` and
`sucursal_id` to zones, tables, users (via assignment), orders, cash shifts, payments,
audit logs, and outbox events. The MVP seeds one branch.

**Why:** RNF-17 requires multi-branch without redesign. Retrofitting `sucursal_id` into
operational tables later is a high-risk migration.

### 2. Separate fulfillment and payment states

- `Pedido.estado_cumplimiento`: `nuevo`, `confirmado`, `en_preparacion`, `listo`,
  `entregado`, `cancelado`.
- `Pedido.estado_pago`: `pendiente`, `parcial`, `pagado`, `reembolsado`.
- `Pago.estado`: `registrado`, `verificado`, `conciliado`, `anulado`.

**Why:** v1.0 rule 1 requires `conciliado=true` to mark an order as paid, while rule 7
creates electronic payments with `conciliado=false` until close. The two rules cannot
both hold. Payment verification and bank reconciliation are different events.

### 3. Payment lifecycle

A cash payment is created `verificado`. An electronic payment is created `registrado`,
the cashier marks it `verificado` after checking the provider app/portal, and the close
marks it `conciliado` after bank reconciliation. `anulado` requires a reason, an
authorizing user, and an audit entry.

### 4. Modifier groups

Add:

- `GrupoModificador`: `nombre`, `tipo` (`unico` / `multiple`), `min_seleccion`,
  `max_seleccion`, `obligatorio`, `orden`.
- `Modificador`: belongs to a group; `precio_extra`.
- `ProductoGrupoModificador`: which groups apply to a product.
- `PedidoItemModificador`: snapshot of the selected modifier (name, price, type).

Remove `producto_modificador.max_seleccion`; the limit belongs to the group, not to the
product-modifier pair.

**Why:** real café menus need "choose one size", "choose one milk", and "add extras".
The v1.0 model cannot express a single-choice group with a minimum.

### 5. Currency and exchange-rate snapshots

- `Moneda` is a global catalog (CUP, MLC, USD).
- `TasaCambio` stores historical rates per business and currency pair, with
  `vigente_desde` / `vigente_hasta`.
- `ProductoPrecio` stores one price per product and currency.
- `Pedido` and `Pago` store `moneda_id` and `tasa_cambio_aplicada`.

**Why:** a single global `tasa_cambio` makes historical reports wrong when the rate
changes. The snapshot preserves the commercial value at the time of sale.

### 6. Cash movements

`MovimientoCaja.tipo`: `ingreso`, `retiro`, `gasto_menor`, `devolucion_efectivo`,
`propina_efectivo`, `ajuste`. **Discounts are not cash movements.** A discount lives on
the order or line and reduces the total; it never enters the cash drawer formula.

`TurnoCaja` adds `sucursal_id`, `caja_id`, `fecha_operativa`, and a partial unique
index for one open shift per physical cash register.

### 7. Courier liquidation

Add `LiquidacionRepartidor` (header: courier, cash shift, date, collected total,
delivered total, difference, status) and `LiquidacionDetalle` (assignment, amount).
`AsignacionRepartidor` references the liquidation.

**Why:** v1.0 scatters `efectivo_cobrado`, `liquidado`, and `turno_caja_id` on the
assignment. A header/detail model makes the close auditable and supports partial
liquidations.

### 8. Order numbering and idempotency

- `Pedido.fecha_operativa` (date) and `numero_dia` (int).
- Unique `(sucursal_id, fecha_operativa, numero_dia)`.
- `ContadorDiario` row per branch and business day, updated with `SELECT ... FOR UPDATE`.
- `Pedido.idempotency_key` unique per business; `Pago.idempotency_key` unique per
  business.

**Why:** `numero_dia` alone can collide between cashiers and across midnight. A
double-tap on the QR menu must not create two orders.

### 9. Audit log

Add `sucursal_id`, `request_id`, `user_agent`, and `ip`. Keep the append-only trigger.
The application role has `INSERT` only; a separate migration role owns DDL.

### 10. Outbox

Add `OutboxEvent` with a monotonic `sequence`, aggregate identity, event type, payload,
version, status, attempts, and availability timestamp. It is written in the same
transaction as the aggregate change.

### 11. Auth and devices

Add `Sesion` (refresh token hash, device, expiry, revocation) and `Dispositivo`
(device registration for POS/KDS/print agent). This is required for revocation and for
the future local node.

### 12. Soft delete and unique constraints

Use partial unique indexes for active rows:

- `usuario (negocio_id, username) WHERE activo`
- `mesa (sucursal_id, numero) WHERE activo`
- `categoria (negocio_id, nombre) WHERE activo`

**Why:** a global unique constraint prevents reusing a username or table number after
a soft delete.

### 13. Money type

All monetary columns are `Decimal(12,2)` in Prisma and `numeric(12,2)` in PostgreSQL.
No JavaScript `number` for money. Exchange rates use `Decimal(12,6)`.

## Consequences

- The MVP schema is slightly larger than v1.0, but it avoids high-risk migrations.
- The order and payment state machines are clearer and testable.
- Reports can rely on snapshots and historical FX.
- The outbox and idempotency add a small write overhead, acceptable for the target
  volume.
- The root `modelo-datos.md` should be updated to v1.1 or marked as superseded by the
  Prisma schema.
