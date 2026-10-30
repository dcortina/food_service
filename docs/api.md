# API conventions

Base URL: `/api/v1`

## Authentication

### Login

`POST /api/v1/auth/login`

```json
{
  "username": "owner",
  "password": "CafeQR123!"
}
```

Response:

```json
{
  "accessToken": "<jwt>",
  "refreshToken": "<opaque>",
  "expiresIn": 900,
  "user": {
    "id": "uuid",
    "nombre": "Owner",
    "rol": "dueno",
    "permisos": ["pedido.crear", "caja.abrir"]
  }
}
```

- Access token: JWT RS256, 15 minutes, `Authorization: Bearer <token>`.
- Refresh token: opaque, 30 days, rotated on every refresh.
- `POST /api/v1/auth/refresh` with `{ "refreshToken": "..." }`.
- `POST /api/v1/auth/logout` revokes the current session.

### PIN re-authorization

Sensitive actions require a PIN from a user with the required permission:

`POST /api/v1/auth/pin/verify`

```json
{
  "pin": "1234",
  "accion": "pedido.cancelar",
  "entidadId": "uuid"
}
```

The response contains a short-lived `authorizationToken` (5 minutes) that must be sent
in the `X-Authorization-Token` header of the sensitive request. PIN attempts are
rate-limited and audited.

## Errors

All errors use RFC 7807 `application/problem+json`:

```json
{
  "type": "https://cafeqr.cu/errors/validation",
  "title": "Validation failed",
  "status": 422,
  "detail": "El campo cantidad debe ser mayor que cero.",
  "instance": "/api/v1/pedidos",
  "requestId": "01J...",
  "errors": [
    { "field": "items[0].cantidad", "message": "must be greater than 0" }
  ]
}
```

- `400` malformed request.
- `401` missing or invalid token.
- `403` authenticated but not allowed.
- `404` not found.
- `409` conflict (idempotency, state transition, duplicate).
- `422` validation error.
- `429` rate limited.
- `500` unexpected error (no stack trace in the response).

## Idempotency

Order and payment creation accept:

```http
Idempotency-Key: <uuid>
```

The same key and payload returns the original resource with `200`; a different payload
with the same key returns `409`.

## Pagination, filtering, sorting

```http
GET /api/v1/pedidos?page=1&pageSize=20&sort=creadoEn&order=desc&estado=listo
```

Response:

```json
{
  "data": [],
  "meta": {
    "page": 1,
    "pageSize": 20,
    "total": 0,
    "totalPages": 0
  }
}
```

- `page` starts at 1.
- `pageSize` max 100.
- `sort` is a whitelisted field per endpoint.
- `order` is `asc` or `desc`.

## Dates, times, money

- Timestamps are ISO 8601 UTC (`2026-10-29T14:30:00.000Z`).
- Business day is `YYYY-MM-DD` in the business timezone (`America/Havana`).
- Money is a **string** with two decimals (`"12.50"`) to avoid floating point errors.
  Exchange rates use up to six decimals (`"1.000000"`).
- Quantities are integers.

## OpenAPI

- Generated from NestJS decorators with `@nestjs/swagger`.
- Served at `/api/docs` in non-production; protected in production.
- `openapi.json` is generated in CI and committed to `libs/api-client/openapi.json`.
- `libs/api-client` is regenerated with `@hey-api/openapi-ts`; do not hand-edit it.

## Realtime events

Socket.IO namespace `/realtime`, authenticated with the access token in the handshake.

Rooms:

- `negocio:{negocioId}:sucursal:{sucursalId}`
- `kds:{sucursalId}`
- `pedido:{pedidoId}`

Events:

| Event | Payload |
| --- | --- |
| `pedido.creado` | `{ pedidoId, sucursalId, canal, estadoCumplimiento }` |
| `pedido.actualizado` | `{ pedidoId, estadoCumplimiento, estadoPago }` |
| `pedido.item.actualizado` | `{ pedidoId, itemId, estadoItem }` |
| `pago.actualizado` | `{ pagoId, pedidoId, estado }` |
| `mesa.actualizada` | `{ mesaId, estado }` |
| `print.job.actualizado` | `{ jobId, estado }` |

Clients fetch a REST snapshot on connect/reconnect and then apply events. Event replay
is a Phase 2 concern.

## Permissions

Permission codes are dot-separated: `<modulo>.<accion>`.

Examples:

- `pedido.crear`, `pedido.cancelar`, `pedido.descuento`
- `caja.abrir`, `caja.cerrar`, `caja.movimiento`, `caja.retiro`
- `pago.registrar`, `pago.conciliar`, `pago.anular`
- `catalogo.gestionar`, `mesa.gestionar`, `usuario.gestionar`
- `reporte.ver`, `reporte.exportar`, `auditoria.ver`
- `configuracion.gestionar`, `repartidor.asignar`, `repartidor.liquidar`
- `kds.ver`, `kds.actualizar`

The API enforces permissions; the frontend uses the same codes to hide unavailable
actions, but never as the only protection.
