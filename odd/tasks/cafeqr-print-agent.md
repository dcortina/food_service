# CaféQR Cuba — Print Agent

- **Objective:** Implement a local print agent with a LAN HTTP API, SQLite queue,
  ESC/POS network printing, dry-run mode, and cloud polling fallback.
- **Branch:** `feat/print-agent` (based on `main` at `d498ccc`)
- **Delivery strategy:** `ask-on-risk`
- **Test runner:** dry-run print agent + HTTP/curl; physical printer validation is
  on-site.
- **Status:** In progress

## Specs

### S1 — Local LAN API

- `POST /print` accepts `{ tipo, payload }` and enqueues a print job.
- `GET /health` returns the agent status.
- `GET /jobs` lists recent local jobs.
- The API binds to `0.0.0.0` on `PRINT_AGENT_PORT`.
- Requests require `Authorization: Bearer <PRINT_AGENT_TOKEN>`.

**Acceptance:** a POS on the LAN can enqueue a comanda without the cloud; the agent
returns `202` and prints in dry-run mode.

### S2 — SQLite queue

- Jobs are stored in SQLite with `source`, `cloud_id`, `tipo`, `payload`, `status`,
  `attempts`, `error`, `created_at`, and `available_at`.
- The worker prints pending jobs in order.
- Failed jobs retry up to 3 times with a delay; after that they are `fallido`.
- The queue survives agent restarts.

**Acceptance:** enqueue two jobs, restart the agent, and both print once.

### S3 — Printer modes

- `PRINTER_MODE=dry-run` logs the formatted ticket and marks it printed.
- `PRINTER_MODE=network` sends ESC/POS bytes to `PRINTER_HOST:PRINTER_PORT`.
- `PRINTER_WIDTH` controls the line width (32 for 58 mm, 48 for 80 mm).
- Comandas and customer tickets have separate layouts.
- Cash tickets can open the cash drawer.

**Acceptance:** dry-run prints a readable comanda and ticket; network mode is
configured but requires on-site hardware validation.

### S4 — Cloud polling fallback

- The agent polls `GET /api/v1/print/jobs/pending` with the agent token, business id,
  and branch id.
- Each pending job is enqueued locally; the agent marks it `impreso` or `fallido`
  through `POST /api/v1/print/jobs/:id/status`.
- Duplicate cloud jobs are ignored while they are already in the local queue.
- Polling failures do not stop the local LAN API.

**Acceptance:** confirming an order creates a `comanda` job; the agent polls it, prints
in dry-run, and the job becomes `impreso`.

### S5 — Order integration

- `POST /api/v1/orders/:id/confirm` creates a `comanda` print job after the order
  confirmation commits.
- The job payload is the mapped order (business, table, items, modifiers, notes,
  totals).
- Print job creation failures are logged and do not roll back the order confirmation.

**Acceptance:** after confirming an order, `print_job` contains one pending comanda.

### S6 — Security

- The agent token is a shared secret from the environment, never committed.
- The cloud print endpoints use the same token and are marked public for JWT but
  protected by the agent guard.
- The agent does not expose the printer directly to the internet.

**Acceptance:** a request without the token returns 401.

### S7 — Verification

- `pnpm nx run-many -t build` passes.
- Dry-run local API prints a sample comanda.
- Cloud polling prints a confirmed order and updates `print_job`.
- The physical printer path is documented for on-site validation.

## Tasks

| ID | Task | Specs | Route | Status |
| --- | --- | --- | --- | --- |
| T1 | Create the feature document and branch | — | inline | done |
| T2 | Add SQLite/Express dependencies | S1, S2 | inline | done |
| T3 | Implement the API print module and agent guard | S4, S6 | inline | done |
| T4 | Create the comanda job on order confirm | S5 | inline | done |
| T5 | Implement the print agent app skeleton | S1 | inline | done |
| T6 | Implement the SQLite queue and worker | S2 | inline | done |
| T7 | Implement ESC/POS formatting and network/dry-run modes | S3 | inline | done |
| T8 | Implement cloud polling and status reporting | S4 | inline | done |
| T9 | Verify local and cloud dry-run flows | S7 | inline | done |
| T10 | Update docs and commit the work unit | S7 | inline | done |

## Log

### L1 — Request

> si

The product owner chose the local LAN API + SQLite queue option for the print agent,
with cloud polling as a fallback.

### L2 — Scope notes

- The agent runs on the local network (mini PC, Raspberry Pi, or laptop).
- Dry-run is the test mode in this environment; the physical printer requires on-site
  validation.
- Network ESC/POS is supported; USB printing can be added through the OS print queue
  later.
- The agent uses a shared token for the MVP; device-bound tokens can replace it later.
- The cash drawer is opened by the ticket print when configured.

### L3 — Verification (2026-10-30)

- `pnpm nx build api` and `pnpm nx build print-agent` pass.
- API `GET /print/jobs/pending` with the agent token returns 200; without the token it
  returns 401.
- Print agent `GET /health` returns `{ status: "ok", mode: "dry-run" }`.
- Print agent `POST /print` returns 202; the worker prints the dry-run comanda and the
  local job becomes `impreso`; without the token it returns 401.
- Confirming an order creates a `comanda` in `print_job`; the agent polls it, prints
  the dry-run comanda (`CaféQR Demo`, table, channel, items, modifiers, total), and the
  job becomes `impreso`.
- The cloud poller recovers after the API restarts and does not duplicate an already
  queued cloud job.
- The order payload now includes `negocio` and `sucursal` so the printed comanda shows
  the business and branch.
- The physical `network` mode is implemented but requires on-site printer validation;
  this environment verified the dry-run and queue/cloud pipeline.
- `better-sqlite3` was added to the root and app dependencies; the native build was
  approved in `pnpm-workspace.yaml`.
