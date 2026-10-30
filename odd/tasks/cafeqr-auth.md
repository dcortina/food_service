# CaféQR Cuba — Auth and RBAC

- **Objective:** Implement authentication, refresh rotation, RBAC, PIN
  re-authorization, and user management for the MVP.
- **Branch:** `feat/auth`
- **Delivery strategy:** `ask-on-risk`
- **Test runner:** HTTP verification with `curl` for this slice; Jest/Playwright are
  added in the foundation follow-up.
- **Status:** In progress

## Specs

### S1 — Login with JWT RS256

- `POST /api/v1/auth/login` accepts `{ username, password }`.
- Passwords are verified with argon2id.
- Returns an access token (15 min) and an opaque refresh token (30 days).
- The access token contains `sub`, `negocioId`, `sucursalId`, `rol`, and `permisos`.
- A wrong username or password returns `401` with a generic message.

**Acceptance:** `owner` / `CafeQR123!` logs in and can call `/auth/me`; a wrong
password returns 401.

### S2 — Refresh rotation and logout

- `POST /api/v1/auth/refresh` accepts `{ refreshToken }`.
- The token is hashed in `sesion.refresh_hash`; only a hash is stored.
- Refresh rotates the token: the old session is revoked and a new one is created.
- `POST /api/v1/auth/logout` revokes the current session.

**Acceptance:** refreshing returns a new pair; the old refresh token stops working.

### S3 — RBAC guard

- `JwtAuthGuard` validates the bearer token.
- `PermissionsGuard` checks `@RequirePermissions()` metadata against the token
  permissions.
- `@Public()` marks login, refresh, and health endpoints as unauthenticated.
- Tenant scope comes from the token, never from the request body.

**Acceptance:** a cashier receives 403 on `GET /users`; an owner receives 200.

### S4 — Current user

- `GET /api/v1/auth/me` returns the user, role, permissions, business, and branch.

**Acceptance:** the response matches the seeded user and branch.

### S5 — PIN re-authorization

- `POST /api/v1/auth/pin/verify` accepts `{ pin, accion, entidadId? }`.
- The PIN is verified with argon2id against the current user.
- The user must hold the permission named by `accion`.
- Returns a short-lived `authorizationToken` (5 min) with `typ: "pin"`.
- PIN failures are rate-limited and audited.

**Acceptance:** the owner PIN `1234` authorizes `pedido.cancelar`; a wrong PIN
returns 401.

### S6 — User management

- `GET /api/v1/users` (paginated, permission `usuario.gestionar`).
- `POST /api/v1/users` creates a user with role, branch, password, and optional PIN.
- `GET /api/v1/users/:id` and `PATCH /api/v1/users/:id`.
- All queries are scoped to the token's `negocioId`.

**Acceptance:** the owner can create a cashier; the cashier cannot list users.

### S7 — Audit

- Login success/failure, refresh, logout, PIN verification, and user changes write to
  `log_auditoria`.
- Audit entries include user, business, branch, action, entity, IP, and user agent when
  available.

**Acceptance:** `SELECT * FROM log_auditoria` shows the auth events after the flow.

### S8 — Documentation and verification

- Swagger documents every auth and user endpoint.
- The verification flow is reproducible with `curl`.
- The API builds and runs with the new modules.

**Acceptance:** `pnpm nx build api` succeeds and the curl flow passes.

## Tasks

| ID | Task | Specs | Route | Status |
| --- | --- | --- | --- | --- |
| T1 | Generate development JWT keys and configure paths | S1 | inline | done |
| T2 | Implement JWT strategy, guards, and decorators | S1, S3 | inline | done |
| T3 | Implement `AuthService` login, refresh, logout, PIN | S1, S2, S5 | inline | done |
| T4 | Implement `AuthController` and DTOs | S1, S2, S4, S5 | inline | done |
| T5 | Implement `AuditService` | S7 | inline | done |
| T6 | Implement `UsersModule` CRUD | S6 | inline | done |
| T7 | Wire global guards and public routes | S3 | inline | done |
| T8 | Verify with curl and Swagger | S8 | inline | done |
| T9 | Update docs and commit the work unit | S8 | inline | in progress |

## Log

### L1 — Request

> vale seguimos

The product owner authorized the next work unit: the first vertical slice starts with
authentication and RBAC.

### L2 — Scope notes

- The MVP is single-tenant; login resolves the user by username. Multi-tenant login
  (business slug or subdomain) is a later slice.
- JWT keys live in `.secrets/` for development and are never committed.
- The access token is RS256 so a future local node can validate it with the public key.
- The PIN authorization token is a JWT with `typ: "pin"` and a 5-minute TTL; the guard
  that consumes it is implemented in the cash/order slice.

### L3 — Verification (2026-10-30)

- `pnpm nx build api` passes.
- Owner login returns 200 and a valid RS256 access token.
- `GET /auth/me` returns the owner, business, branch, role, and 26 permissions.
- `GET /users` with the owner token returns 200 and the seeded users.
- `GET /users` with a cashier token returns 403.
- `POST /auth/pin/verify` with PIN `1234` and `pedido.cancelar` returns 200 and a
  short-lived authorization token.
- Wrong PIN returns 401; wrong password returns 401.
- Refresh rotation returns a new pair; reusing the old refresh token returns 401.
- Logout revokes the session; refreshing after logout returns 401.
- `POST /users` creates `cajero2` and `cajero3`; `GET /users?search=` finds them;
  `PATCH /users/:id` updates the name; the new user can log in.
- `log_auditoria` contains `auth.login`, `auth.login.failed`, `auth.pin.failed`,
  `auth.pin.verify`, `auth.refresh`, `auth.logout`, `usuario.crear`, and
  `usuario.actualizar`.
- Fixed during verification: the create-user response initially returned
  `sucursal: null` because the branch assignment happened after the include; the
  service now re-fetches the user inside the transaction.
