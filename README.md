# CaféQR Cuba

Repository: <https://github.com/dcortina/food_service>

Management system for small cafés: QR table ordering, unified order board, kitchen
display, cash control, delivery, and optional electronic payments.

The first release is **cloud-first** and the domain model is **sync-ready**, so a local
node can be added in Phase 2 without a schema rewrite. See
[ADR-0001](docs/adr/0001-hybrid-cloud-first-sync-ready.md).

## Stack

- **Monorepo:** Nx 24 + pnpm 11 workspaces
- **Frontend:** Angular 22 (standalone, signals, zoneless), Tailwind CSS 4,
  `@ngrx/signals`
- **Backend:** NestJS 11, Prisma 7.10.1, PostgreSQL 16, Redis 7 + BullMQ
- **API docs:** Swagger / OpenAPI 3.1 at `/api/docs`
- **Auth:** JWT RS256 + rotating refresh tokens + argon2id PINs
- **Realtime:** Socket.IO
- **Tests:** Jest (API and Angular unit), Playwright (e2e), Testcontainers (PostgreSQL)
- **Deploy:** Docker Compose + Caddy on a VPS

## Prerequisites

- Node.js 24 LTS
- pnpm 11 (`corepack enable` or `npm i -g pnpm@11`)
- Docker + Docker Compose
- A PostgreSQL client is optional; `docker compose` provides the database.

## Quick start

```bash
# 1. Install dependencies
pnpm install

# 2. Start PostgreSQL (Redis is optional until background jobs are enabled)
docker compose -f docker/compose.yaml up -d postgres
# docker compose -f docker/compose.yaml up -d redis

# 3. Configure the environment
cp .env.example .env
# Generate the JWT key pair (see docs/api.md) and fill JWT_PRIVATE_KEY / JWT_PUBLIC_KEY

# 4. Generate the Prisma client and run migrations
pnpm db:generate
pnpm db:migrate
pnpm db:seed

# 5. Start the API
pnpm nx serve api

# 6. Start a frontend (example: admin)
pnpm nx serve admin

# Cashier POS (port 4201)
pnpm nx serve pos --port 4201

# Kitchen display (port 4202)
pnpm nx serve kds --port 4202

# Customer menu PWA (port 4203)
pnpm nx serve menu --port 4203

# Courier app (port 4204)
pnpm nx serve delivery --port 4204
```

The API runs at `http://localhost:3000/api/v1` and Swagger at
`http://localhost:3000/api/docs`.

The admin app runs at `http://localhost:4200`, the cashier POS at
`http://localhost:4201`, the kitchen display at `http://localhost:4202`, the
customer menu at `http://localhost:4203`, and the courier app at
`http://localhost:4204`; all proxy `/api` to the API. Demo logins:
`owner` / `CafeQR123!` for the admin, `cajero` / `CafeQR123!` for the POS,
`cocina` / `CafeQR123!` for the KDS, and `repartidor` / `CafeQR123!` for
delivery. The menu is public and opens from a table QR URL such as
`http://localhost:4203/qr/6d6d75d3-3854-4038-a61f-cc5351ec13fb` (seeded Mesa 1).

Delivery orders are assigned from **POS → Pedidos → Asignar** (requires
`repartidor.asignar`). Courier liquidations are closed from **Administración →
Repartidores** (requires `repartidor.liquidar`).

The business name and logo are managed in **Administración → Configuración**. The
login page reads the public branding from `/api/v1/public/branding`, so the same
identity is shown before authentication.

Categories and products are managed in **Administración → Catálogo**. The page
requires `catalogo.ver` to read and `catalogo.gestionar` to create or edit.
Product prices use the active currencies from `/api/v1/catalog/currencies`.

**Administración → Reportes** shows sales by channel, payment method, product,
cashier, and courier, plus the open cash-close summary. CSV downloads require
`reporte.exportar`.

The admin also includes read-only **Pedidos** and **Caja** views, **Pagos** for
verify/concile/void, **Mesas y QR** for table and QR management, **Usuarios** for
team management, **Repartidores** for courier liquidations, and modifier-group
creation inside **Catálogo**.

POS checkout supports split payments, discounts (with `pedido.descuento`),
WhatsApp/Instagram/Facebook order origins, and cash movements with authorizer
handling. The KDS has an audible overdue alert, table QRs can be printed or saved
as PDF, and the menu has a basic service worker for shell/GET caching.

## Workspace layout

```text
apps/
  api/            NestJS API (REST + WebSocket + BullMQ workers)
  admin/          Angular admin/owner panel
  pos/            Angular POS and cashier workspace
  kds/            Angular kitchen display
  menu/           Angular customer menu PWA
  delivery/       Angular delivery app
  print-agent/    Node CLI for ESC/POS printing
libs/
  shared/         Domain enums, constants, pure helpers
  api-client/     Typed HTTP client (OpenAPI generation planned)
  ui/             Shared UI primitives (brand mark)
  auth/           Angular auth services, interceptor, and guards
  config/         Runtime branding and configuration services
prisma/           Schema, migrations, seed
docs/             Architecture and ADRs
odd/              Feature documents and work logs
```

## Scripts

| Command | Description |
| --- | --- |
| `pnpm build` | Build all projects |
| `pnpm lint` | Lint all projects |
| `pnpm test` | Run unit tests |
| `pnpm e2e` | Run Playwright tests |
| `pnpm format` | Format with Prettier |
| `pnpm db:generate` | Generate the Prisma client |
| `pnpm db:migrate` | Create/apply a development migration |
| `pnpm db:deploy` | Apply migrations in production |
| `pnpm db:seed` | Seed development data |
| `pnpm db:studio` | Open Prisma Studio |

## Conventions

- **UI copy:** Spanish (neutral, professional).
- **Code, comments, internal docs:** English.
- **Commits:** Conventional Commits, one reviewable work unit per commit.
- **Money:** `Decimal` in Prisma/PostgreSQL; never floating point.
- **Tenant scope:** every operational query filters by `negocio_id` and `sucursal_id`.
- **API changes:** update the OpenAPI document and regenerate `libs/api-client` in the
  same change.

## Documentation

- [Architecture](docs/architecture.md)
- [ADR-0001: hybrid cloud-first MVP](docs/adr/0001-hybrid-cloud-first-sync-ready.md)
- [ADR-0002: monorepo and stack](docs/adr/0002-monorepo-and-stack.md)
- [ADR-0003: domain model v1.1](docs/adr/0003-domain-model-v1.1.md)
- [Foundation feature document](odd/tasks/cafeqr-foundation.md)
- Product references: `prd.md`, `srs.md`, `modelo-datos.md`, `presupuesto-hardware.md`
