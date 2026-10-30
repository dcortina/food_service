# ADR-0001: Hybrid cloud-first MVP with a sync-ready domain model

- **Status:** Accepted
- **Date:** 2026-10-29
- **Deciders:** Product owner, Engineering
- **Supersedes:** N/A

## Context

The PRD and SRS describe a local-first system: a server inside the café (mini PC or
Raspberry Pi) plus a cloud VPS with asynchronous synchronization. The initial delivery,
however, must be a professional web product built with Angular, NestJS, PostgreSQL,
Prisma, and Swagger.

Building the full local-first topology in the first release would multiply scope: two
NestJS runtimes, two PostgreSQL databases, an outbox relay, conflict resolution,
offline authentication, device identity, remote updates, and a LAN HTTPS strategy.
That would delay validation of the core business flow (menu → order → kitchen → cash).

## Decision

We will build a **cloud-first MVP** and design the domain model and infrastructure so
that a local-first deployment can be added in Phase 2 without a schema rewrite.

Concretely:

1. **One NestJS API and one PostgreSQL database** on a VPS for the MVP.
2. **UUID primary keys** and `negocio_id` / `sucursal_id` on every operational table.
   The MVP deploys one business and one branch, but the schema is tenant- and
   branch-ready.
3. **Transactional outbox** (`OutboxEvent`) from day one. The MVP does not run a sync
   worker, but every critical write emits an event with an aggregate type, aggregate
   id, event type, payload, and version.
4. **Monotonic `version` columns** on mutable aggregates and **`idempotency_key`** on
   order and payment creation.
5. **Business-day (`fecha_operativa`)** and branch-scoped daily counters for order
   numbering. The business day is computed with the business timezone and a
   configurable cutoff (default 04:00 America/Havana).
6. **A print agent** that runs on the local network and polls the cloud API for print
   jobs. This is the only local component in the MVP. It is required because browsers
   cannot reliably drive ESC/POS printers or open a cash drawer.
7. **PWA assets are served from the cloud over HTTPS**, which satisfies the service
   worker secure-context requirement. Offline behavior in the MVP is limited to cached
   assets and a queued order retry; the kitchen still needs connectivity.
8. **No local database in the MVP.** The local node, offline auth, and conflict
   resolution are designed but not implemented.

## Consequences

### Positive

- Faster path to a working product and real café feedback.
- One deployment, one database, simpler operations, backups, and observability.
- The schema, outbox, idempotency, and branch model already support the future local
  node.
- The print agent solves the hardware integration without a full local server.

### Negative

- The MVP does **not** fulfill the "works without internet" promise. That promise is
  explicitly deferred to Phase 2.
- The print agent is an extra component to install and support on site.
- Some local-first concerns (offline auth, device identity, conflict resolution,
  LAN HTTPS) are designed but not implemented yet.

## Follow-ups (Phase 2)

- Local node: NestJS + PostgreSQL on the café server.
- Outbox relay with exponential backoff and idempotent apply.
- Device registration and offline authentication.
- LAN HTTPS / local domain / PWA delivery strategy.
- Conflict resolution policy (local is the operational source of truth for orders and
  payments; last-write-wins only for master data).
- Remote update and rollback mechanism for the local node.
