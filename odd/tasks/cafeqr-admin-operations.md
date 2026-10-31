# CaféQR Cuba — Admin Operations Pages

- **Objective:** Complete the remaining admin operational screens: order board,
  cash history, payments, tables/QR, users, and modifier group creation.
- **Branch:** `feat/admin-operations`
- **Delivery strategy:** `ask-on-risk`
- **Test runner:** `corepack pnpm nx build api`, `admin`, plus HTTP checks.
- **Status:** Done — committed on `feat/admin-operations`, pending review/merge.

## Specs

### S1 — Read-only order board

- `/orders` lists the latest 100 orders with code, channel/table, customer,
  compliance state, payment state, total, and created time.
- Search by code/customer/phone; filter by compliance state.

**Acceptance:** the owner can inspect the unified tray without duplicating POS
actions.

### S2 — Cash history

- `/cash` lists shifts (open/closed) with cashier, opening float, expected,
  counted, difference, and state.
- “Ver cierre” loads the cash-close report and allows CSV export when permitted.
- Opening and closing remain in the POS.

**Acceptance:** the owner can inspect historical shifts and export a close.

### S3 — Payments

- `/payments` lists payments with order, method, state, amount, received/change,
  reference, and date.
- Electronic registered payments can be verified.
- Verified electronic payments can be reconciled.
- Any non-voided payment can be voided with a reason.
- Actions respect `pago.registrar`, `pago.conciliar`, and `pago.anular`.

**Acceptance:** the owner can advance a payment through verify → reconcile or
void it.

### S4 — Tables and QR

- `/tables` lists zones and tables with state and capacity.
- Create/edit zones and tables.
- View the menu QR, copy its link, download the PNG, and regenerate the code.
- Actions respect `mesa.gestionar`; cashiers can view in read-only mode.

**Acceptance:** a new table gets a working menu URL/QR; regenerating invalidates
the old code.

### S5 — Users

- `/users` lists users with role, branch, contact, last access, and state.
- Create/edit users with name, username, password, PIN, phone, role, branch, and
  active state.
- Activate/deactivate from the table.
- `GET /users/roles` and `GET /users/branches` feed the form.
- Requires `usuario.gestionar`.

**Acceptance:** the owner can create a user and see the role/branch options.

### S6 — Modifier groups

- Catalog tab **Modificadores** lists groups and options.
- Create a group with type, min/max, required flag, order, and multiple option
  rows (name, type, extra price).
- Created groups appear in the product form for linking.

**Acceptance:** a new group is created and available when editing a product.

## Tasks

- **T1** — Admin orders page. `S1`. Done.
- **T2** — Cash history and close detail. `S2`. Done.
- **T3** — Payments page and actions. `S3`. Done.
- **T4** — Tables/QR page and client methods. `S4`. Done.
- **T5** — Users page, roles/branches API, and client. `S5`. Done.
- **T6** — Modifier group creation in catalog. `S6`. Done.
- **T7** — Build and HTTP verification. Done.
- **T8** — Commit. Done.

## Log

### L1 — User request

"vamos a mergear y seguimos, probamos nuevamente el flujo cuando este terminado todo"

Merged the frontend branch and continued on `feat/admin-operations` to remove the
remaining admin placeholders.

### L2 — Decisions

- Admin orders/cash are read-only; operational changes stay in POS.
- Payments actions reuse existing permissions and endpoints.
- Tables/QR uses the existing zone/table APIs and generates the QR PNG from the
  backend.
- Users needs role/branch metadata; added `GET /users/roles` and
  `GET /users/branches`.
- Modifier groups are created from the catalog tab and linked through the existing
  product form.

### L3 — Verification

- API and admin builds pass.
- All admin routes return 200: orders, cash, payments, reports, tables, users,
  couriers, catalog, dashboard, settings.
- Users roles returned 6 roles; branches returned Centro.
- Tables zones returned 3 zones / 11 tables; QR JSON and PNG endpoints returned
  200; PNG content type `image/png`.
- Payments list returned data; cash shift list returned data.
- A modifier group `Prueba E2E` with one option was created through the API used
  by the page.
- No browser click-through was possible; validation was build + HTTP.
- Follow-up completed in `cafeqr-frontend-polish.md`: cash movements,
  menu service worker, print/PDF QR, KDS sound, split payments, discounts, and
  social channels. Physical printer validation remains on-site.

Commit: `bd42147` (`feat(admin): complete operational management pages`).
