# CaféQR Cuba

Repository: <https://github.com/dcortina/food_service>

Management system for small cafés: QR table ordering, unified order board, kitchen
display, cash control, delivery, and optional electronic payments.

The first release is **cloud-first** and the domain model is **sync-ready**, so a local
node can be added in Phase 2 without a schema rewrite. See
[ADR-0001](docs/adr/0001-hybrid-cloud-first-sync-ready.md).

## Stack

- **Monorepo:** Nx 24 + pnpm 11 workspaces
- **Frontend:** Angular 22 (standalone, signals, zoneless), Tailwind CSS 4, Angular CDK,
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
```

The API runs at `http://localhost:3000/api/v1` and Swagger at
`http://localhost:3000/api/docs`.

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
  api-client/     Generated OpenAPI client
  ui/             Design system
  auth/           Angular auth services and guards
  config/         Runtime configuration helpers
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
