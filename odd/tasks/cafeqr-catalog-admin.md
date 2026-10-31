# CaféQR Cuba — Admin Catalog UI

- **Objective:** Close the workflow gap by letting the owner create categories and
  products from the admin, including price, currency, availability, and modifier
  group links.
- **Branch:** `feat/frontend-foundation` (same branch)
- **Delivery strategy:** `ask-on-risk`
- **Test runner:** `corepack pnpm nx build api`, `corepack pnpm nx build admin`,
  plus HTTP end-to-end smoke tests.
- **Status:** Done — committed on `feat/frontend-foundation`, pending review/merge.

## Specs

### S1 — Catalog read model

- The admin loads categories, all products (available and unavailable), modifier
  groups, and active currencies.
- `GET /api/v1/catalog/currencies` exposes active currencies for product pricing.
- The page is visible to users with `catalogo.ver`; editing requires
  `catalogo.gestionar`.

**Acceptance:** the owner sees the existing catalog and currency options.

### S2 — Categories

- Create a category with name, order, and active flag.
- Edit an existing category.
- The category list shows product count and state.

**Acceptance:** a new category is immediately available in the product form.

### S3 — Products

- Create a product with category, name, description, price, currency, preparation
  time, optional image URL, availability, and existing modifier groups.
- Edit an existing product, including price and modifier links.
- Toggle availability from the product table.
- Product search and category filter.

**Acceptance:** a new product appears in the admin table, POS catalog, public
menu, and can be ordered.

### S4 — Verification

- Builds pass for API and admin.
- A new category `Flujo E2E` and product `Producto Flujo E2E` (123.00 CUP) were
  created through the same API calls used by the page.
- The product appeared in POS, public menu, KDS, dashboard, and sales-by-product
  report.
- POS order `#005` was created, confirmed, marked ready, and paid in cash.
- Delivery order `#006` used the same product and completed the courier flow.

## Tasks

- **T1** — `GET /catalog/currencies` and client types. `S1`. Done.
- **T2** — Catalog admin page, product/category forms, modifier links. `S1`–`S3`. Done.
- **T3** — Build and end-to-end API smoke test. `S4`. Done.
- **T4** — Commit. `S1`–`S4`. In progress.

## Log

### L1 — User request

"no vamos hacerlo con un producto ya existente"

The user wants the complete workflow to start from a brand-new product, not a
seeded one. The missing piece was the admin catalog UI.

### L2 — Decisions

- Add `GET /catalog/currencies` because the product create DTO requires a
  currency id and the admin had no way to discover it.
- Build the catalog page inside the existing admin app; reuse the food-service
  theme and permission-filtered navigation.
- Link existing modifier groups from the product form; creating modifier groups
  from the UI is a follow-up.
- Keep the admin table as the source of truth for availability; the public menu
  still returns active products, while POS only shows available ones.

### L3 — Verification

- `corepack pnpm nx build api` and `corepack pnpm nx build admin` pass.
- `/catalog` serves in the admin dev server; `/api/v1/catalog/currencies` returns
  CUP, MLC, and USD.
- API end-to-end:
  - Created category `Flujo E2E` and product `Producto Flujo E2E` at 123.00.
  - POS order `#005` created, confirmed, marked ready, and paid in cash.
  - Dashboard top product and sales-by-product report show the new product.
  - Delivery order `#006` used the same product, was assigned, started,
    delivered, and liquidated.
- No browser was available, so the UI was verified through build and the exact
  API contracts the page calls, not click-through.
- Remaining UI gaps: modifier group creation, delivery assignment/liquidation,
  reports page, tables/QR, and users.

Commit: pending.
