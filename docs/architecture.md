# CaféQR Cuba — System Architecture

- **Status:** Draft for implementation
- **Date:** 2026-10-29
- **Related:** ADR-0001 (hybrid cloud-first), ADR-0002 (monorepo/stack), ADR-0003 (domain model v1.1)

## 1. Context

CaféQR Cuba is a management system for small cafés. It digitizes table ordering through
QR codes, unifies sales channels, controls cash, and supports optional electronic
payments (Transfermóvil / EnZona). The market context imposes three constraints:

- Internet connectivity is intermittent.
- Cash is the primary payment method.
- WhatsApp Business automation is not viable; social channels are handled manually.

The first release is **cloud-first** (ADR-0001): one API and one PostgreSQL database on
a VPS. The domain model and event infrastructure are designed so a local node can be
added in Phase 2 without a schema rewrite.

## 2. System context

```text
                    ┌─────────────────────────────────────────────┐
                    │                CLOUD (VPS)                  │
                    │                                             │
  Customer phone ──▶│  Caddy (TLS) ──▶ Angular PWAs (static)      │
  (QR / menu)       │                    │                        │
                    │                    ▼                        │
  POS / Admin ─────▶│              NestJS API  ──▶ PostgreSQL 17  │
  KDS / Delivery    │                    │            │           │
                    │                    │            └──▶ Redis  │
                    │                    ▼                        │
                    │              Socket.IO / WSS                │
                    │              BullMQ workers                 │
                    └───────────────────▲─────────────────────────┘
                                        │ HTTPS (poll print jobs)
                              ┌─────────┴──────────┐
                              │  Local print agent │
                              │  (mini PC / LAN)   │
                              └─────────┬──────────┘
                                        │ USB / Ethernet
                              ┌─────────▼──────────┐
                              │ Thermal printer +  │
                              │ cash drawer        │
                              └────────────────────┘
```

The only on-premise component in the MVP is the print agent. It polls the cloud API for
print jobs and talks ESC/POS to the printer. This is required because browsers cannot
reliably drive thermal printers or open a cash drawer.

## 3. Monorepo layout

```text
apps/
  api/            NestJS API (REST + WebSocket + BullMQ workers)
  admin/          Angular admin/owner panel
  pos/            Angular POS and cashier workspace (PWA)
  kds/            Angular kitchen display (full-screen)
  menu/           Angular customer menu (PWA, public)
  delivery/       Angular delivery app (PWA, mobile-first)
  print-agent/    Node CLI that polls print jobs and drives ESC/POS
libs/
  shared/         Domain enums, constants, pure helpers
  api-client/     Generated OpenAPI client
  ui/             Design system (Tailwind + Angular CDK)
  auth/           Angular auth services, guards, interceptors
  config/         Runtime configuration helpers
prisma/
  schema.prisma   Source of truth for the relational model
  migrations/     SQL migrations (including triggers, partial indexes, RLS later)
  seed.ts         Development seed
docs/
  adr/            Architecture decision records
  architecture.md This document
docker/
  compose.yaml    Local development services
  Caddyfile       Production reverse proxy
  Dockerfile.api  API image
odd/
  tasks/          Feature documents and work logs
```

Nx module boundaries:

- `type:app` may depend on `type:lib`.
- `type:lib` may not depend on `type:app`.
- `scope:shared` may be used by any app.
- `scope:api` is API-only.
- `scope:web` is Angular-only.

## 4. Backend modules

| Module | Responsibility |
| --- | --- |
| `AuthModule` | Login, refresh rotation, PIN re-auth, device sessions, JWT strategy. |
| `UsersModule` | Users, roles, permissions, branch assignment. |
| `BusinessModule` | Business, branch, configuration, currencies and exchange rates. |
| `CatalogModule` | Categories, products, prices, modifier groups, availability. |
| `TablesModule` | Zones, tables, QR codes. |
| `OrdersModule` | Order lifecycle, items, state machine, daily numbering, idempotency. |
| `PaymentsModule` | Payments, methods, verification, reconciliation, refunds. |
| `CashModule` | Cash shifts, movements, denominations, blind count, close. |
| `KitchenModule` | KDS queries, item preparation states, timers. |
| `DeliveryModule` | Couriers, assignments, cash collection, liquidation. |
| `CustomersModule` | Customer records and order history. |
| `ReportsModule` | Sales, channels, products, cash close, exports. |
| `AuditModule` | Append-only audit log. |
| `SyncModule` | Transactional outbox and (Phase 2) relay. |
| `RealtimeModule` | Socket.IO gateway and room management. |
| `PrintModule` | Print job queue and agent API. |
| `HealthModule` | Liveness and readiness. |

Cross-cutting: validation pipe, RFC 7807 exception filter, request id middleware,
tenant context, permissions guard, throttler, Helmet, compression, CORS.

## 5. Frontend applications

| App | Audience | Key concerns |
| --- | --- | --- |
| `admin` | Owner / manager | Dashboard, catalog, tables/QR, users, reports, settings. |
| `pos` | Cashier | Order board, table map, manual orders, payments, cash shift. |
| `kds` | Kitchen | Full-screen tickets, timers, sound alerts, keyboard shortcuts. |
| `menu` | Customer | QR entry, menu, modifiers, cart, order status. PWA. |
| `delivery` | Courier | Assigned orders, address/phone, cash collection, liquidation. PWA. |

Shared frontend concerns:

- Angular standalone components, signals, zoneless change detection.
- Tailwind CSS + Angular CDK; `libs/ui` owns tokens and primitives.
- `@ngrx/signals` SignalStore per feature.
- Generated API client from OpenAPI; no hand-written DTO duplication.
- Auth interceptor with refresh rotation; role/permission guards.
- Spanish UI copy; English code, comments, and internal docs.

## 6. Domain model principles

The Prisma schema is the source of truth. The v1.1 corrections are recorded in
ADR-0003. The non-negotiable principles are:

1. **Tenant and branch scope.** Every operational row carries `negocio_id` and
   `sucursal_id`. The MVP deploys one business and one branch.
2. **Order fulfillment and payment are separate.** `estado_cumplimiento` describes the
   operational flow; `estado_pago` describes the money. `pagado` is not a kitchen state.
3. **Payment lifecycle is explicit.** `registrado → verificado → conciliado`, plus
   `anulado`. Electronic payments are verified by the cashier and reconciled against
   the bank at close.
4. **Snapshots preserve history.** Product name, unit price, modifiers, exchange rate,
   and tax are copied into the order at creation.
5. **Money is `Decimal`.** No floating point in the backend or database.
6. **Idempotency.** Order and payment creation accept an idempotency key.
7. **Business day.** `fecha_operativa` is computed with the business timezone and a
   configurable cutoff. Daily order numbers are unique per branch and business day.
8. **Append-only audit.** `log_auditoria` rejects UPDATE and DELETE at the database
   level.
9. **Outbox.** Critical writes emit an `OutboxEvent` in the same transaction.
10. **No hard deletes** on master data; use `activo` and partial unique indexes.

## 7. Authentication and authorization

- **Access token:** JWT RS256, 15 minutes, contains `sub`, `negocio_id`, `sucursal_id`,
  `rol`, and permission claims.
- **Refresh token:** opaque, 30 days, rotating, stored as a hash, revocable per device.
- **PIN:** separate argon2id hash, used only to authorize sensitive actions (cancel,
  discount, cash withdrawal, shift close). Rate-limited and audited.
- **RBAC:** role-permission table; `@RequirePermissions()` guard. Roles: owner,
  manager, cashier, waiter, kitchen, courier.
- **Tenant context:** derived from the token, never from a request body. Services
  always filter by `negocio_id` and `sucursal_id`.
- **Phase 2:** local node validates access tokens with the public key; refresh and
  offline login are designed later.

## 8. Realtime

- Socket.IO over WSS, JWT in the handshake.
- Rooms: `negocio:{id}:sucursal:{id}`, `kds:{branchId}`, `order:{orderId}`.
- Events: `order.created`, `order.updated`, `order.item.updated`,
  `payment.updated`, `table.updated`, `print.job.updated`.
- Clients fetch a REST snapshot on connect/reconnect, then apply events. The MVP does
  not implement event replay; the outbox enables it in Phase 2.

## 9. Payments and cash

- Methods: `efectivo`, `transfermovil`, `enzona`.
- Cash: `monto_recibido` and `cambio`; cashier verifies immediately.
- Electronic: cashier verifies the payment in the provider app/portal and marks it
  `verificado`; bank reconciliation marks it `conciliado` at close.
- Cash shift: open with opening float and denomination breakdown; movements are
  `ingreso`, `retiro`, `gasto_menor`, `devolucion_efectivo`, `propina_efectivo`,
  `ajuste`. Discounts are **not** cash movements.
- Expected cash = opening float + cash payments + cash income − cash expenses −
  withdrawals − cash refunds + liquidated courier cash.
- Courier liquidation is a header/detail entity, not scattered fields.

## 10. Printing

- `PrintJob` rows are created in the same transaction as the order/payment event.
- The print agent authenticates with a device token, polls jobs, prints, and reports
  success/failure.
- Jobs are idempotent: a job id is printed at most once; retries are explicit.
- Network thermal printer (Ethernet) is recommended; USB is supported by the agent.

## 11. Sync readiness (Phase 2)

- `OutboxEvent` is written in the same transaction as the aggregate change.
- Each event carries `aggregate_type`, `aggregate_id`, `event_type`, `payload`, and
  `version`.
- A relay worker will use `FOR UPDATE SKIP LOCKED`, exponential backoff, and
  idempotent apply on the local node.
- Local node is the operational source of truth for orders and payments; the cloud
  never overwrites local operational rows.
- Master data uses last-write-wins with `version` and `actualizado_en`.

## 12. Security

- TLS 1.2+ everywhere; HSTS in production.
- Helmet, CORS allow-list, rate limiting, request size limits.
- Argon2id for passwords and PINs.
- Secrets from environment variables; never committed.
- PostgreSQL application role with minimum privileges; no DDL at runtime.
- Audit log append-only via trigger and grants.
- Dependency audit and OWASP ZAP baseline in CI.
- PII minimization: customer name, phone, and address only when needed.

## 13. Observability

- Structured logs (pino) with request id, tenant, branch, user, and latency.
- Health endpoints: `/health/live`, `/health/ready`.
- Error tracking (Sentry or compatible) for API and frontends.
- Metrics: order creation latency, KDS event lag, print job failures, cash close
  discrepancies.
- Alerting: API down, database down, queue backlog, print agent offline.

## 14. Testing

- **API unit:** Jest, pure domain services and state machines.
- **API integration:** Jest + Testcontainers PostgreSQL; repositories and transactions.
- **API e2e:** Supertest against a real Nest application.
- **Angular unit:** Jest + Testing Library.
- **E2E:** Playwright for the critical flows (QR order → KDS → cash → close).
- **Contract:** OpenAPI diff in CI; generated client must compile.
- **Load:** k6 for order creation and KDS fan-out.
- **Security:** OWASP ZAP baseline and `pnpm audit`.

## 15. Deployment

```text
VPS
├── Caddy            TLS, reverse proxy, static frontends
├── api              NestJS (Docker)
├── worker           BullMQ workers (same image, different command)
├── postgres         PostgreSQL 17 (Docker volume)
└── redis            Redis 7 (Docker volume)
```

- CI builds and tests on every pull request.
- Main branch builds Docker images, pushes to the registry, and deploys with Compose.
- Backups: daily `pg_dump` to S3-compatible storage, 30-day retention; monthly restore
  drill.
- The local print agent is installed separately on site; it only needs outbound HTTPS.

## 16. MVP scope and phases

**MVP (cloud-first):**

- Auth, roles, permissions, business/branch settings.
- Catalog: categories, products, prices, modifier groups, availability.
- Tables, zones, QR generation.
- Orders: QR, counter, waiter, manual social channels; state machine; KDS realtime.
- Cash: open, cash payments, movements, close, blind count.
- Electronic payments: manual registration and reconciliation fields.
- Courier: assignment, delivery, cash collection, liquidation.
- Reports: sales by channel, top products, cash close.
- Print agent and thermal tickets.
- Audit log and sensitive-action PIN.

**Phase 2 (local-first):**

- Local node with PostgreSQL, outbox relay, offline auth, LAN PWA strategy.
- Conflict resolution and device management.
- Remote updates and rollback.

**Phase 3 (growth):**

- Inventory and recipes.
- Loyalty.
- Multi-currency price lists and historical FX.
- Multi-branch consolidation.
