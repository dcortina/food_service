# CaféQR Cuba — Catalog and Tables

- **Objective:** Implement categories, products, prices, modifier groups, zones,
  tables, QR generation, and the public menu endpoint.
- **Branch:** `feat/catalog-tables` (based on `feat/auth`)
- **Delivery strategy:** `ask-on-risk`
- **Test runner:** HTTP verification with `curl` for this slice.
- **Status:** In progress

## Specs

### S1 — Categories

- `GET /api/v1/catalog/categories` lists active categories with product counts.
- `POST /api/v1/catalog/categories` creates a category.
- `PATCH /api/v1/catalog/categories/:id` updates name, order, or active flag.
- All queries are scoped to the token's `negocioId`.
- Permission: `catalogo.ver` for reads, `catalogo.gestionar` for writes.

**Acceptance:** the owner can create and list categories; a user without
`catalogo.gestionar` receives 403 on writes.

### S2 — Products and prices

- `GET /api/v1/catalog/products` supports pagination, category filter, search, and
  availability filter.
- `POST /api/v1/catalog/products` accepts name, category, description, availability
  window, preparation time, prices, and modifier group ids.
- `GET /api/v1/catalog/products/:id` returns the product with prices and modifier
  groups.
- `PATCH /api/v1/catalog/products/:id` updates fields, prices, and group links.
- Prices are strings with two decimals in the API; Prisma stores `Decimal`.

**Acceptance:** create a product with a CUP price and a modifier group; list it; update
its price; the response preserves the two-decimal string format.

### S3 — Modifier groups and modifiers

- `GET /api/v1/catalog/modifier-groups` lists groups with modifiers.
- `POST /api/v1/catalog/modifier-groups` creates a group with optional nested
  modifiers.
- `PATCH /api/v1/catalog/modifier-groups/:id` updates group fields.
- `POST /api/v1/catalog/modifier-groups/:id/modifiers` adds a modifier.
- `PATCH /api/v1/catalog/modifiers/:id` updates a modifier.
- `POST /api/v1/catalog/products/:id/modifier-groups` links a group to a product.
- `DELETE /api/v1/catalog/products/:id/modifier-groups/:groupId` unlinks it.

**Acceptance:** the seeded “Tamaño” group can be linked to a product and returned by
the product detail.

### S4 — Zones and tables

- `GET /api/v1/tables/zones` lists zones with tables for the token's branch.
- `POST /api/v1/tables/zones` and `PATCH /api/v1/tables/zones/:id` manage zones.
- `GET /api/v1/tables` lists tables with zone, status, and QR URL.
- `POST /api/v1/tables`, `GET /api/v1/tables/:id`, and `PATCH /api/v1/tables/:id`
  manage tables.
- Permission: `mesa.ver` for reads, `mesa.gestionar` for writes.

**Acceptance:** create a zone and a table; the table receives a UUID QR code; the
waiter can list tables but cannot create them.

### S5 — QR generation and download

- `POST /api/v1/tables/:id/regenerate-qr` issues a new opaque QR code.
- `GET /api/v1/tables/:id/qr` returns the code and the public menu URL.
- `GET /api/v1/tables/:id/qr.png` returns a PNG ready to print.
- The URL uses `MENU_BASE_URL` and the format `/qr/{codigoQr}`.

**Acceptance:** regenerate changes the code; the PNG downloads with the table number
in the filename.

### S6 — Public menu

- `GET /api/v1/public/menu/:codigoQr` is public.
- Resolves the table, branch, and business from the QR code.
- Returns active categories, active products, prices per currency, and active modifier
  groups/modifiers.
- Unavailable products are returned with `disponible: false` so the PWA can disable
  them.

**Acceptance:** scanning a seeded table QR returns the seeded menu; an unknown code
returns 404.

### S7 — Audit

- Category, product, modifier group, modifier, zone, table, and QR changes write to
  `log_auditoria` with the current user, business, branch when applicable, action, and
  entity.
- Audit failures do not break the request.

**Acceptance:** `log_auditoria` shows `catalogo.*` and `mesa.*` actions after the flow.

### S8 — Verification

- `pnpm nx run-many -t build` passes.
- The curl flow for categories, products, modifiers, tables, QR, and public menu
  passes.
- Swagger documents the new endpoints and pagination parameters as numbers.

## Tasks

| ID | Task | Specs | Route | Status |
| --- | --- | --- | --- | --- |
| T1 | Add `mesa.ver` permission and re-run the seed | S4, S7 | inline | done |
| T2 | Add `qrcode` and `MENU_BASE_URL` | S5 | inline | done |
| T3 | Implement catalog DTOs | S1–S3 | inline | done |
| T4 | Implement `CatalogService` | S1–S3 | inline | done |
| T5 | Implement `CatalogController` | S1–S3 | inline | done |
| T6 | Implement tables DTOs and `TablesService` | S4, S5 | inline | done |
| T7 | Implement `TablesController` | S4, S5 | inline | done |
| T8 | Implement public menu | S6 | inline | done |
| T9 | Wire modules and Swagger | S1–S6 | inline | done |
| T10 | Verify with curl and audit | S7, S8 | inline | done |
| T11 | Update docs and commit the work unit | S8 | inline | done |

## Log

### L1 — Request

> correcto, podemos continuar

The product owner authorized the next slice after auth: catalog, tables, QR, and the
public menu.

### L2 — Scope notes

- Catalog is business-scoped; tables are branch-scoped through their zone.
- The public menu resolves the business and branch from the table QR; it does not
  require a login.
- Prices are returned as strings to preserve decimal precision.
- The QR PNG endpoint uses the `qrcode` package; PDF generation is deferred.
- The PWA menu route and cart are the next frontend slice; this work unit delivers the
  API contract.

### L3 — Verification (2026-10-30)

- `pnpm nx build api` and `pnpm nx run-many -t build` pass.
- Read endpoints return 200: categories (3), products (8), modifier groups (3),
  zones (2), tables (10).
- Prices are returned as strings with two decimals (`"250.00"`, `"150.00"`).
- Public menu by the seeded table QR returns CaféQR Demo, table 1, 3 categories, and
  8 products.
- Created category “Postres”, product “Flan” with price `150.00` and the “Tamaño”
  group; created group “Sabor” with Vainilla/Chocolate; linked it to Flan.
- Created zone “Barra” and table “11”; regenerated its QR; the QR PNG endpoint returns
  200 with `image/png` and a 3.5 KB image.
- Public menu for table 11 returns Postres → Flan with price `150.00` and groups
  Tamaño/Sabor.
- Permissions: cashier `GET /tables` 200 and `POST /tables` 403; cashier
  `GET /catalog/categories` 200 and `POST /catalog/categories` 403; waiter
  `GET /tables` 200; kitchen `GET /tables` 403.
- Audit contains `catalogo.categoria.crear`, `catalogo.grupo.crear`,
  `catalogo.producto.crear`, `catalogo.producto.grupo.vincular`,
  `catalogo.producto.grupo.desvincular`, `mesa.zona.crear`, `mesa.crear`, and
  `mesa.qr.regenerar`.
- Fixed during verification: money formatting now uses `toFixed(2)` so the API never
  returns `"180"` instead of `"180.00"`; the composite link audit used a non-UUID
  `entidadId`, which the append-only audit rejected, so it now uses the product id and
  stores the group id in the JSON payload.
