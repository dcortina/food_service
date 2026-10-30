# ADR-0002: Nx monorepo and baseline stack

- **Status:** Accepted
- **Date:** 2026-10-29
- **Deciders:** Engineering

## Context

CaféQR Cuba has one API and several frontends with different operating contexts:
owner/manager admin, cashier POS, kitchen display, customer menu PWA, and delivery.
They share domain types, validation rules, authentication, and a design system. A
single repository with enforced boundaries keeps the contract in sync and avoids
duplicated DTOs.

## Decision

### Workspace

- **Nx 24 integrated monorepo** with **pnpm 11** workspaces.
- **Node.js 24 LTS**.
- Project tags and Nx module boundaries to enforce app/lib dependency rules.
- Nx generators for Angular and NestJS; Nx task pipeline for build, lint, test, and
  affected commands.

### Backend

- **NestJS 12** with the Express adapter (ecosystem compatibility; revisit Fastify if
  load tests require it).
- **Prisma 7.10.1** with the `prisma-client` generator, `@prisma/adapter-pg`, and
  **PostgreSQL 17**.
- **Swagger / OpenAPI 3.1** generated from NestJS decorators, served at `/api/docs`.
- **class-validator** + **class-transformer** for request validation.
- **Socket.IO** for realtime events (KDS, POS, menu status).
- **BullMQ + Redis 7** for print jobs, report generation, and the future sync relay.
- **argon2id** for passwords and PINs; JWT RS256 access tokens with rotating refresh
  tokens stored hashed in the database.

### Frontend

- **Angular 22** standalone components, signals, zoneless change detection.
- **Tailwind CSS 4** + **Angular CDK** for the design system (`libs/ui`).
- **@ngrx/signals** (SignalStore) for feature state.
- **@hey-api/openapi-ts** generates `libs/api-client` from the API OpenAPI document.
- **Angular Service Worker** for the menu and POS PWAs.
- **IndexedDB** (via `idb`) for the offline order queue and cached menu data.

### Quality

- **Jest** for API unit and integration tests (Testcontainers for PostgreSQL).
- **Vitest** for Angular unit tests.
- **Playwright** for end-to-end tests.
- **ESLint** + **Prettier** + **lint-staged**.
- **GitHub Actions** CI: lint, test, build, OpenAPI diff, Docker image build.

### Deployment

- **Docker Compose** on a VPS: Caddy (TLS), NestJS API, PostgreSQL, Redis, static
  frontends.
- **Caddy** for automatic HTTPS and reverse proxy.
- Daily `pg_dump` backups to S3-compatible storage, 30-day retention.
- Health endpoints: `/health/live`, `/health/ready`.

## Consequences

### Positive

- One dependency graph, one lockfile, one CI pipeline.
- Shared types and generated API client keep frontend and backend aligned.
- Nx affected commands keep CI fast as the workspace grows.
- The stack is mainstream and well supported, which matters for a long-lived product.

### Negative

- Nx adds learning overhead and configuration surface.
- A monorepo requires discipline around module boundaries and ownership.
- Prisma 7's driver-adapter model requires explicit `@prisma/adapter-pg` setup and a
  `prisma.config.ts`; it is not the old "just import PrismaClient" flow.

## Alternatives considered

- **Separate repositories per app:** rejected because the shared contract and design
  system would drift.
- **Angular Material instead of Tailwind + CDK:** rejected for the POS/KDS visual
  density and theming needs; Material remains an option for admin tables if needed.
- **TypeORM instead of Prisma:** rejected because Prisma's migration and type
  generation workflow is stronger for this team and the schema is relational.
- **Fastify adapter:** deferred; Express is sufficient for the MVP performance target.
