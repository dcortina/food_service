# CaféQR Cuba — Foundation

- **Objective:** Establish the Nx monorepo, the baseline stack, the Prisma domain model,
  the API conventions, and the quality gates for the cloud-first MVP.
- **Branch:** `feat/foundation`
- **Delivery strategy:** `ask-on-risk` (single PR until the 400-line budget is reached)
- **Test runner:** Jest (API and Angular unit), Playwright (e2e)
- **Status:** In progress

## Specs

### S1 — Workspace and toolchain

- Nx 24 integrated monorepo with pnpm 11 workspaces.
- Node.js 24 LTS.
- Angular 22, NestJS 12, TypeScript 6.
- ESLint + Prettier + lint-staged.
- `nx run-many` targets for build, lint, test, and e2e.

**Acceptance:** `pnpm install`, `pnpm nx run-many -t lint`, and
`pnpm nx run-many -t build` succeed on a clean checkout.

### S2 — Application and library skeleton

- Apps: `api`, `admin`, `pos`, `kds`, `menu`, `delivery`, `print-agent`.
- Libs: `shared`, `api-client`, `ui`, `auth`, `config`.
- Nx tags and module boundaries enforce app/lib direction.

**Acceptance:** every app builds; no library imports an app.

### S3 — Domain model v1.1

- Prisma 7.10.1 with the `prisma-client` generator and `@prisma/adapter-pg`.
- PostgreSQL 17.
- Entities and corrections from ADR-0003: `Sucursal`, separated order/payment states,
  modifier groups, FX snapshots, cash movement types, courier liquidation, daily
  counters, idempotency keys, audit log, outbox, sessions, devices.
- Migrations are SQL-first for triggers, partial indexes, and future RLS.

**Acceptance:** `prisma migrate dev` creates the schema; `prisma validate` passes; the
seed creates one business, one branch, roles, permissions, an owner, a sample menu,
and ten tables.

### S4 — Authentication and RBAC

- JWT RS256 access token (15 min) and rotating refresh token (30 days, hashed).
- Argon2id passwords and PINs.
- Permission guard with role-permission mapping.
- PIN re-auth endpoint for sensitive actions, rate-limited and audited.
- Tenant context from the token, never from the request body.

**Acceptance:** an owner can log in, create a cashier, and the cashier cannot access
owner-only endpoints. A wrong PIN is rejected and audited.

### S5 — API conventions and OpenAPI

- URI versioning: `/api/v1`.
- RFC 7807 problem responses.
- `class-validator` DTOs with Swagger metadata.
- Pagination, filtering, and sorting conventions.
- OpenAPI 3.1 at `/api/docs`; `openapi.json` generated in CI.
- `libs/api-client` generated from the OpenAPI document.

**Acceptance:** the OpenAPI document is valid; the generated client compiles; every
public endpoint has a documented response.

### S6 — Local development environment

- `docker/compose.yaml` with PostgreSQL 17 and Redis 7.
- `.env.example` with every required variable.
- `pnpm db:migrate` and `pnpm db:seed` work against the local database.
- Health endpoints `/health/live` and `/health/ready`.

**Acceptance:** a new developer can run the stack with the README steps.

### S7 — Quality gates

- Jest unit and integration tests; Testcontainers for PostgreSQL.
- Angular Jest unit tests.
- Playwright critical-flow smoke test.
- ESLint and Prettier in CI.
- GitHub Actions: install, lint, test, build, OpenAPI diff, Docker build.

**Acceptance:** CI is green on the foundation branch; a failing test blocks the merge.

### S8 — Documentation

- `docs/architecture.md`.
- ADR-0001, ADR-0002, ADR-0003.
- `README.md` with setup, structure, scripts, and conventions.
- `docs/api.md` with the error format, auth flow, and pagination.

**Acceptance:** a new developer can understand the architecture and run the project
without asking.

### S9 — Seed data

- One business: CaféQR Demo.
- One branch: Centro.
- Roles and permissions.
- Owner, manager, cashier, waiter, kitchen, courier users.
- Categories, products, modifier groups, tables, and QR codes.

**Acceptance:** the seed is idempotent; running it twice does not duplicate rows.

### S10 — Observability baseline

- Structured logs with request id, tenant, branch, user, and latency.
- Health checks.
- Error tracking hook (Sentry-compatible DSN optional).
- Queue and print job failure counters.

**Acceptance:** a request can be traced from the HTTP log to the database query and the
outbox event.

## Tasks

| ID | Task | Specs | Route | Status | Evidence |
| --- | --- | --- | --- | --- | --- |
| T1 | Create the Nx workspace and root configuration | S1 | inline | done | `package.json`, `nx.json`, `tsconfig.base.json`, `pnpm-workspace.yaml` |
| T2 | Install Nx plugins and generate the API and Angular apps | S1, S2 | delegated | in progress | Nx 24.0.2 + plugins linked; Angular 22 install running |
| T3 | Create the shared libraries and module boundaries | S2 | delegated | pending | — |
| T4 | Implement the Prisma schema v1.1 and the first migration | S3 | delegated | pending | — |
| T5 | Implement the seed | S9 | delegated | pending | — |
| T6 | Implement auth, RBAC, and PIN re-auth | S4 | delegated | pending | — |
| T7 | Implement API conventions, error filter, and Swagger | S5 | delegated | pending | — |
| T8 | Generate the API client and wire it into the Angular apps | S5 | delegated | pending | — |
| T9 | Add Docker Compose, `.env.example`, and health checks | S6 | inline | pending | — |
| T10 | Add CI, lint, test, and build gates | S7 | delegated | pending | — |
| T11 | Write the README and API conventions | S8 | inline | pending | — |
| T12 | Verify the foundation and commit the work unit | S1–S10 | inline | pending | — |

## Log

### L1 — Original request (verbatim)

> quiero que analises la documentacion que tengo en la raiz de esta carpeta, ya que tenemos un nuevo proyecto en mente la cracion de un proyecto web para un food service. Ya sabes como debes de comportarte como un experto senior en desarrollo web, trabajaremos como siempre bajo los frameworks de angular y nestjs, usaremos postgresql para la base de datos, como orm prisma y swagger para la documentacion de la api. Dime si tienes alguna duda antes de empezar, este proyecto nos tiene que quedar super profesional. en la raiz de la carpeta tienes el prd.md, el modelo-datos.md, srs.md y el presupuesto-hardware.md, esta sujeto a nuevas ideas, nuevos cambios que den trase a mejoras. Dime si te queda claro antes de empezar. Suerte y vamos a darle duro para que sea un proyecto de avanza !! de acuerdo :)

### L2 — Architecture decision

> C

The product owner selected option C: cloud-first MVP with a sync-ready domain model.
The full local-first topology is deferred to Phase 2. See ADR-0001.

### L3 — Scope notes

- The root PRD, SRS, data model, and hardware budget remain product-level references.
- The Prisma schema is the implementation source of truth for the relational model.
- The MVP deploys one business and one branch, but the schema is tenant- and
  branch-ready.
- The print agent is the only on-premise component in the MVP.
- The first vertical slice after the foundation is auth + catalog + tables + order
  creation + KDS realtime.

### L4 — Foundation progress (2026-10-29)

- Nx 24.0.2 installed with pnpm 11.5.0; project graph sees `shared`.
- Angular 22.2.4 and Angular CLI 22.2.5 installed.
- NestJS 12.3.2 plus config, Swagger, JWT, Passport, Throttler, WebSockets, argon2,
  Helmet, compression, and cookie-parser installed.
- PostgreSQL 16 Alpine is running on `localhost:5434` because Docker Hub returned 403
  for `postgres:17-alpine` and the local image is 16. The PRD requires PostgreSQL 15+.
- The Prisma schema v1.1 and the custom domain-constraints migration are written.
- Network constraint: the npm registry is slow and flaky. The pnpm store was used
  offline, and missing tarballs were added with `pnpm store add`. `minimumReleaseAge`
  is set to 0 in `pnpm-workspace.yaml` to keep setup moving; revisit before release.
- Next: install Prisma 7.10.1, generate the client, run the initial migration and seed,
  then generate the API and Angular apps.
