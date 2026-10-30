# MODELO DE DATOS — CaféQR Cuba

## Esquema de Base de Datos v1.0

| Campo                 | Valor                                                                    |
| :-------------------- | :----------------------------------------------------------------------- |
| **Producto**          | CaféQR Cuba                                                              |
| **Versión**           | 1.0                                                                      |
| **Motor recomendado** | PostgreSQL 15+ (local) con replicación asíncrona a PostgreSQL en la nube |
| **ORM sugerido**      | Prisma / TypeORM / SQLAlchemy (según stack)                              |
| **Fecha**             | 2026-10-29                                                               |

---

## 1. CONVENCIONES

- **Nombres de tablas:** singular, snake_case, en español (ej. `pedido`, `producto`).
- **Claves primarias:** `id` UUID v4 (no autoincremental, para facilitar sincronización local↔nube).
- **Timestamps:** `creado_en`, `actualizado_en` (UTC, tipo `timestamptz`).
- **Borrado lógico:** campo `activo` (boolean) en tablas maestras; nunca `DELETE` físico en producción.
- **Moneda:** precios en `numeric(12,2)`; se guarda moneda en tabla `moneda` para soporte multimoneda.
- **Auditoría:** toda tabla crítica tiene `creado_por` y `actualizado_por` (FK a `usuario`).

---

## 2. DIAGRAMA ENTIDAD-RELACIÓN (resumen textual)

negocio (1) ──< usuario
negocio (1) ──< zona ──< mesa
negocio (1) ──< categoria ──< producto ──< producto_modificador >── modificador
producto (1) ──< receta >── insumo
negocio (1) ──< cliente
cliente (1) ──< pedido
mesa (1) ──< pedido
pedido (1) ──< pedido_item >── producto
pedido (1) ──< pago
turno_caja (1) ──< movimiento_caja
turno_caja (1) ──< pago
usuario (1) ──< turno_caja (cajero)
usuario (1) ──< asignacion_repartidor (repartidor)
pedido (1) ──< asignacion_repartidor
usuario (1) ──< log_auditoria
usuario >── rol >── permiso
configuracion (1) ── negocio

---

---

## 3. ENTIDADES Y ATRIBUTOS

### 3.1. `negocio`

Configuración maestra del establecimiento (soporta multi-sucursal en Fase 3).

| Campo               | Tipo         | Restricciones                      | Descripción                         |
| :------------------ | :----------- | :--------------------------------- | :---------------------------------- |
| id                  | UUID         | PK                                 | Identificador.                      |
| nombre              | varchar(120) | NOT NULL                           | Nombre comercial.                   |
| logo_url            | text         | NULL                               | URL del logo.                       |
| direccion           | text         | NOT NULL                           | Dirección física.                   |
| telefono            | varchar(30)  | NULL                               | Teléfono de contacto.               |
| whatsapp_numero     | varchar(30)  | NULL                               | Número para enlaces `wa.me`.        |
| email               | varchar(120) | NULL                               | Correo.                             |
| moneda_principal    | char(3)      | NOT NULL, default 'CUP'            | Moneda base.                        |
| zona_horaria        | varchar(50)  | NOT NULL, default 'America/Havana' | Zona horaria.                       |
| impuesto_porcentaje | numeric(5,2) | default 0                          | Impuesto aplicable (si lo hubiera). |
| activo              | boolean      | default true                       | Borrado lógico.                     |
| creado_en           | timestamptz  | default now()                      |                                     |
| actualizado_en      | timestamptz  | default now()                      |                                     |

---

### 3.2. `moneda`

Soporte multimoneda (CUP, MLC, USD).

| Campo       | Tipo          | Restricciones    | Descripción                  |
| :---------- | :------------ | :--------------- | :--------------------------- |
| id          | UUID          | PK               |                              |
| codigo      | char(3)       | UNIQUE, NOT NULL | ISO 4217 o código local.     |
| nombre      | varchar(40)   | NOT NULL         |                              |
| simbolo     | varchar(5)    | NULL             |                              |
| tasa_cambio | numeric(12,4) | default 1        | Respecto a moneda principal. |
| activo      | boolean       | default true     |                              |

---

### 3.3. `rol`

| Campo       | Tipo        | Restricciones    | Descripción                                         |
| :---------- | :---------- | :--------------- | :-------------------------------------------------- |
| id          | UUID        | PK               |                                                     |
| nombre      | varchar(40) | UNIQUE, NOT NULL | dueño, gerente, cajero, mesero, cocina, repartidor. |
| descripcion | text        | NULL             |                                                     |
| es_sistema  | boolean     | default false    | Roles no editables.                                 |

---

### 3.4. `permiso`

| Campo       | Tipo        | Restricciones    | Descripción                           |
| :---------- | :---------- | :--------------- | :------------------------------------ |
| id          | UUID        | PK               |                                       |
| codigo      | varchar(60) | UNIQUE, NOT NULL | ej. `pedido.cancelar`, `caja.cerrar`. |
| descripcion | text        | NULL             |                                       |

**Tabla puente `rol_permiso`:**
| Campo | Tipo | Restricciones |
| :--- | :--- | :--- |
| rol_id | UUID | FK rol, PK compuesta |
| permiso_id | UUID | FK permiso, PK compuesta |

---

### 3.5. `usuario`

| Campo                      | Tipo         | Restricciones    | Descripción              |
| :------------------------- | :----------- | :--------------- | :----------------------- |
| id                         | UUID         | PK               |                          |
| negocio_id                 | UUID         | FK negocio       |                          |
| rol_id                     | UUID         | FK rol           |                          |
| nombre                     | varchar(120) | NOT NULL         |                          |
| username                   | varchar(60)  | UNIQUE, NOT NULL |                          |
| password_hash              | text         | NOT NULL         | bcrypt/argon2.           |
| pin_hash                   | text         | NULL             | PIN para autorizaciones. |
| telefono                   | varchar(30)  | NULL             |                          |
| activo                     | boolean      | default true     |                          |
| ultimo_acceso              | timestamptz  | NULL             |                          |
| creado_en / actualizado_en | timestamptz  | default now()    |                          |

---

### 3.6. `zona`

Agrupación de mesas (salón, terraza, barra).

| Campo      | Tipo        | Restricciones | Descripción |
| :--------- | :---------- | :------------ | :---------- |
| id         | UUID        | PK            |             |
| negocio_id | UUID        | FK negocio    |             |
| nombre     | varchar(60) | NOT NULL      |             |
| activo     | boolean     | default true  |             |

---

### 3.7. `mesa`

| Campo     | Tipo        | Restricciones    | Descripción                            |
| :-------- | :---------- | :--------------- | :------------------------------------- |
| id        | UUID        | PK               |                                        |
| zona_id   | UUID        | FK zona          |                                        |
| numero    | varchar(20) | NOT NULL         | Visible al cliente.                    |
| codigo_qr | varchar(80) | UNIQUE, NOT NULL | Token opaco embebido en la URL del QR. |
| capacidad | int         | default 4        |                                        |
| estado    | varchar(20) | default 'libre'  | libre, ocupada, reservada, inactiva.   |
| activo    | boolean     | default true     |                                        |

> **Nota:** El QR impreso contiene una URL del tipo `https://menu.cafecuba.cu/qr/{codigo_qr}`. Al escanear, la PWA resuelve la mesa por `codigo_qr`.

---

### 3.8. `categoria`

| Campo      | Tipo        | Restricciones | Descripción |
| :--------- | :---------- | :------------ | :---------- |
| id         | UUID        | PK            |             |
| negocio_id | UUID        | FK negocio    |             |
| nombre     | varchar(60) | NOT NULL      |             |
| orden      | int         | default 0     |             |
| activo     | boolean     | default true  |             |

---

### 3.9. `producto`

| Campo                      | Tipo          | Restricciones | Descripción          |
| :------------------------- | :------------ | :------------ | :------------------- |
| id                         | UUID          | PK            |                      |
| categoria_id               | UUID          | FK categoria  |                      |
| nombre                     | varchar(120)  | NOT NULL      |                      |
| descripcion                | text          | NULL          |                      |
| imagen_url                 | text          | NULL          |                      |
| precio                     | numeric(12,2) | NOT NULL      | En moneda principal. |
| moneda_id                  | UUID          | FK moneda     |                      |
| disponible                 | boolean       | default true  | Control de agotado.  |
| disponible_desde           | time          | NULL          | Horario (ej. 07:00). |
| disponible_hasta           | time          | NULL          | Horario (ej. 11:00). |
| tiempo_preparacion_min     | int           | default 5     | Para cálculo de ETA. |
| activo                     | boolean       | default true  |                      |
| creado_en / actualizado_en | timestamptz   | default now() |                      |

---

### 3.10. `modificador`

| Campo        | Tipo          | Restricciones | Descripción                     |
| :----------- | :------------ | :------------ | :------------------------------ |
| id           | UUID          | PK            |                                 |
| negocio_id   | UUID          | FK negocio    |                                 |
| nombre       | varchar(60)   | NOT NULL      | ej. "Extra shot", "Sin azúcar". |
| tipo         | varchar(20)   | NOT NULL      | `agregar` / `quitar` / `nota`.  |
| precio_extra | numeric(12,2) | default 0     |                                 |
| activo       | boolean       | default true  |                                 |

**Tabla puente `producto_modificador`:**
| Campo | Tipo | Restricciones |
| :--- | :--- | :--- |
| producto_id | UUID | FK producto, PK compuesta |
| modificador_id | UUID | FK modificador, PK compuesta |
| es_default | boolean | default false |
| max_seleccion | int | default 1 |

---

### 3.11. `insumo` (Fase 2 — Inventario)

| Campo          | Tipo          | Restricciones | Descripción    |
| :------------- | :------------ | :------------ | :------------- |
| id             | UUID          | PK            |                |
| negocio_id     | UUID          | FK negocio    |                |
| nombre         | varchar(80)   | NOT NULL      |                |
| unidad         | varchar(20)   | NOT NULL      | g, ml, unidad. |
| stock_actual   | numeric(12,3) | default 0     |                |
| stock_minimo   | numeric(12,3) | default 0     |                |
| costo_unitario | numeric(12,2) | default 0     |                |
| activo         | boolean       | default true  |                |

**Tabla `receta` (producto ↔ insumo):**
| Campo | Tipo | Restricciones |
| :--- | :--- | :--- |
| producto_id | UUID | FK producto, PK compuesta |
| insumo_id | UUID | FK insumo, PK compuesta |
| cantidad | numeric(12,3) | NOT NULL |

---

### 3.12. `cliente`

| Campo          | Tipo         | Restricciones | Descripción        |
| :------------- | :----------- | :------------ | :----------------- |
| id             | UUID         | PK            |                    |
| negocio_id     | UUID         | FK negocio    |                    |
| nombre         | varchar(120) | NULL          |                    |
| telefono       | varchar(30)  | NULL          | Clave de búsqueda. |
| direccion      | text         | NULL          |                    |
| notas          | text         | NULL          | Preferencias.      |
| puntos_lealtad | int          | default 0     | Fase 3.            |
| creado_en      | timestamptz  | default now() |                    |

> **Índice:** `UNIQUE (negocio_id, telefono)` cuando teléfono no sea NULL.

---

### 3.13. `pedido`

Entidad central del sistema.

| Campo             | Tipo          | Restricciones    | Descripción                                                                                             |
| :---------------- | :------------ | :--------------- | :------------------------------------------------------------------------------------------------------ |
| id                | UUID          | PK               |                                                                                                         |
| negocio_id        | UUID          | FK negocio       |                                                                                                         |
| numero_dia        | int           | NOT NULL         | Consecutivo diario (ej. #001).                                                                          |
| canal             | varchar(20)   | NOT NULL         | `qr_mesa`, `mostrador`, `mesa_mesero`, `whatsapp`, `instagram`, `facebook`, `domicilio`, `para_llevar`. |
| mesa_id           | UUID          | FK mesa, NULL    | Solo si canal es mesa/QR.                                                                               |
| cliente_id        | UUID          | FK cliente, NULL |                                                                                                         |
| cliente_nombre    | varchar(120)  | NULL             | Snapshot por si no hay cliente registrado.                                                              |
| cliente_telefono  | varchar(30)   | NULL             | Snapshot.                                                                                               |
| direccion_entrega | text          | NULL             | Solo domicilio.                                                                                         |
| estado            | varchar(20)   | NOT NULL         | `nuevo`, `confirmado`, `en_preparacion`, `listo`, `entregado`, `pagado`, `cancelado`.                   |
| subtotal          | numeric(12,2) | NOT NULL         |                                                                                                         |
| descuento         | numeric(12,2) | default 0        |                                                                                                         |
| impuesto          | numeric(12,2) | default 0        |                                                                                                         |
| total             | numeric(12,2) | NOT NULL         |                                                                                                         |
| moneda_id         | UUID          | FK moneda        |                                                                                                         |
| notas             | text          | NULL             |                                                                                                         |
| eta_minutos       | int           | NULL             | Tiempo estimado.                                                                                        |
| cancelado_motivo  | text          | NULL             |                                                                                                         |
| cancelado_por     | UUID          | FK usuario, NULL |                                                                                                         |
| creado_por        | UUID          | FK usuario, NULL | NULL si es autopedido QR.                                                                               |
| creado_en         | timestamptz   | default now()    |                                                                                                         |
| confirmado_en     | timestamptz   | NULL             |                                                                                                         |
| listo_en          | timestamptz   | NULL             |                                                                                                         |
| entregado_en      | timestamptz   | NULL             |                                                                                                         |
| pagado_en         | timestamptz   | NULL             |                                                                                                         |

**Índices recomendados:**

- `(negocio_id, estado, creado_en)`
- `(negocio_id, canal, creado_en)`
- `(mesa_id, estado)`

---

### 3.14. `pedido_item`

| Campo           | Tipo          | Restricciones       | Descripción                                  |
| :-------------- | :------------ | :------------------ | :------------------------------------------- |
| id              | UUID          | PK                  |                                              |
| pedido_id       | UUID          | FK pedido           |                                              |
| producto_id     | UUID          | FK producto         |                                              |
| producto_nombre | varchar(120)  | NOT NULL            | Snapshot histórico.                          |
| cantidad        | int           | NOT NULL, > 0       |                                              |
| precio_unitario | numeric(12,2) | NOT NULL            | Snapshot.                                    |
| modificadores   | jsonb         | NULL                | Array de `{id, nombre, tipo, precio_extra}`. |
| notas           | text          | NULL                |                                              |
| estado_item     | varchar(20)   | default 'pendiente' | `pendiente`, `en_preparacion`, `listo`.      |
| subtotal        | numeric(12,2) | NOT NULL            |                                              |

> **Nota:** Los modificadores se guardan como `jsonb` para preservar el histórico aunque el modificador se edite/elimine.

---

### 3.15. `pago`

| Campo              | Tipo          | Restricciones       | Descripción                                           |
| :----------------- | :------------ | :------------------ | :---------------------------------------------------- |
| id                 | UUID          | PK                  |                                                       |
| pedido_id          | UUID          | FK pedido           |                                                       |
| turno_caja_id      | UUID          | FK turno_caja, NULL | NULL si es cobro de repartidor pendiente de liquidar. |
| metodo             | varchar(20)   | NOT NULL            | `efectivo`, `transfermovil`, `enzona`.                |
| monto              | numeric(12,2) | NOT NULL            |                                                       |
| moneda_id          | UUID          | FK moneda           |                                                       |
| monto_recibido     | numeric(12,2) | NULL                | Solo efectivo.                                        |
| cambio             | numeric(12,2) | NULL                | Solo efectivo.                                        |
| referencia_externa | varchar(100)  | NULL                | ID de transacción EnZona / comprobante Transfermóvil. |
| conciliado         | boolean       | default false       | Para pagos electrónicos.                              |
| conciliado_en      | timestamptz   | NULL                |                                                       |
| conciliado_por     | UUID          | FK usuario, NULL    |                                                       |
| creado_por         | UUID          | FK usuario          |                                                       |
| creado_en          | timestamptz   | default now()       |                                                       |

---

### 3.16. `turno_caja`

| Campo                              | Tipo          | Restricciones     | Descripción                                   |
| :--------------------------------- | :------------ | :---------------- | :-------------------------------------------- |
| id                                 | UUID          | PK                |                                               |
| negocio_id                         | UUID          | FK negocio        |                                               |
| cajero_id                          | UUID          | FK usuario        |                                               |
| fondo_inicial                      | numeric(12,2) | NOT NULL          | Desglose en `turno_caja_denominacion`.        |
| estado                             | varchar(20)   | default 'abierto' | `abierto`, `cerrado`.                         |
| abierto_en                         | timestamptz   | default now()     |                                               |
| cerrado_en                         | timestamptz   | NULL              |                                               |
| efectivo_esperado                  | numeric(12,2) | NULL              | Calculado al cierre.                          |
| efectivo_contado                   | numeric(12,2) | NULL              | Ingresado por cajero (arqueo ciego opcional). |
| descuadre                          | numeric(12,2) | NULL              | contado − esperado.                           |
| total_electronico_reportado        | numeric(12,2) | NULL              | Suma de pagos QR.                             |
| total_electronico_confirmado_banco | numeric(12,2) | NULL              | Ingresado manualmente al conciliar.           |
| observaciones                      | text          | NULL              |                                               |
| autorizado_por                     | UUID          | FK usuario, NULL  | Gerente/dueño que aprueba el cierre.          |

**Tabla `turno_caja_denominacion`** (desglose de fondo inicial y conteo final):
| Campo | Tipo | Restricciones |
| :--- | :--- | :--- |
| id | UUID | PK |
| turno_caja_id | UUID | FK turno_caja |
| tipo | varchar(10) | `inicial` / `final` |
| denominacion | numeric(12,2) | Billete/moneda. |
| cantidad | int | |
| subtotal | numeric(12,2) | |

---

### 3.17. `movimiento_caja`

Registra propinas, descuentos, devoluciones, gastos menores y retiros.

| Campo          | Tipo          | Restricciones    | Descripción                                                                     |
| :------------- | :------------ | :--------------- | :------------------------------------------------------------------------------ |
| id             | UUID          | PK               |                                                                                 |
| turno_caja_id  | UUID          | FK turno_caja    |                                                                                 |
| tipo           | varchar(20)   | NOT NULL         | `propina`, `descuento`, `devolucion`, `gasto_menor`, `retiro`, `ingreso_extra`. |
| monto          | numeric(12,2) | NOT NULL         | Positivo o negativo según tipo.                                                 |
| motivo         | text          | NOT NULL         |                                                                                 |
| autorizado_por | UUID          | FK usuario, NULL | Requerido para retiros/gastos.                                                  |
| creado_por     | UUID          | FK usuario       |                                                                                 |
| creado_en      | timestamptz   | default now()    |                                                                                 |

---

### 3.18. `repartidor`

Extiende a `usuario` con datos específicos.

| Campo      | Tipo        | Restricciones      | Descripción            |
| :--------- | :---------- | :----------------- | :--------------------- |
| id         | UUID        | PK                 |                        |
| usuario_id | UUID        | FK usuario, UNIQUE |                        |
| vehiculo   | varchar(40) | NULL               | moto, bicicleta, auto. |
| activo     | boolean     | default true       |                        |

---

### 3.19. `asignacion_repartidor`

| Campo            | Tipo          | Restricciones       | Descripción                                 |
| :--------------- | :------------ | :------------------ | :------------------------------------------ |
| id               | UUID          | PK                  |                                             |
| pedido_id        | UUID          | FK pedido           |                                             |
| repartidor_id    | UUID          | FK repartidor       |                                             |
| asignado_en      | timestamptz   | default now()       |                                             |
| salida_en        | timestamptz   | NULL                |                                             |
| entregado_en     | timestamptz   | NULL                |                                             |
| efectivo_cobrado | numeric(12,2) | NULL                | Lo que el repartidor reporta haber cobrado. |
| liquidado        | boolean       | default false       |                                             |
| liquidado_en     | timestamptz   | NULL                |                                             |
| turno_caja_id    | UUID          | FK turno_caja, NULL | Turno donde se liquidó.                     |

---

### 3.20. `log_auditoria`

| Campo         | Tipo        | Restricciones    | Descripción                           |
| :------------ | :---------- | :--------------- | :------------------------------------ |
| id            | UUID        | PK               |                                       |
| negocio_id    | UUID        | FK negocio       |                                       |
| usuario_id    | UUID        | FK usuario, NULL | NULL para acciones del sistema.       |
| accion        | varchar(80) | NOT NULL         | ej. `pedido.cancelar`, `caja.cerrar`. |
| entidad       | varchar(40) | NOT NULL         | ej. `pedido`, `pago`.                 |
| entidad_id    | UUID        | NULL             |                                       |
| datos_antes   | jsonb       | NULL             | Snapshot previo.                      |
| datos_despues | jsonb       | NULL             | Snapshot posterior.                   |
| motivo        | text        | NULL             |                                       |
| ip            | inet        | NULL             |                                       |
| creado_en     | timestamptz | default now()    |                                       |

> **Regla:** tabla append-only. Sin `UPDATE` ni `DELETE` permitidos (se refuerza con trigger y permisos de BD). Retención mínima: 1 año.

---

### 3.21. `configuracion`

Pares clave-valor por negocio (ej. `arqueo_ciego=true`, `impresora_ancho=80`).

| Campo          | Tipo        | Restricciones | Descripción |
| :------------- | :---------- | :------------ | :---------- |
| id             | UUID        | PK            |             |
| negocio_id     | UUID        | FK negocio    |             |
| clave          | varchar(60) | NOT NULL      |             |
| valor          | jsonb       | NOT NULL      |             |
| actualizado_en | timestamptz | default now() |             |

**Índice:** `UNIQUE (negocio_id, clave)`.

---

### 3.22. `sincronizacion` (control local↔nube)

| Campo        | Tipo        | Restricciones       | Descripción                                      |
| :----------- | :---------- | :------------------ | :----------------------------------------------- |
| id           | UUID        | PK                  |                                                  |
| entidad      | varchar(40) | NOT NULL            |                                                  |
| entidad_id   | UUID        | NOT NULL            |                                                  |
| operacion    | varchar(10) | NOT NULL            | `insert`, `update`, `delete`.                    |
| payload      | jsonb       | NOT NULL            |                                                  |
| estado       | varchar(20) | default 'pendiente' | `pendiente`, `enviado`, `confirmado`, `fallido`. |
| intentos     | int         | default 0           |                                                  |
| ultimo_error | text        | NULL                |                                                  |
| creado_en    | timestamptz | default now()       |                                                  |
| procesado_en | timestamptz | NULL                |                                                  |

---

## 4. REGLAS DE NEGOCIO CLAVE (a nivel de BD / aplicación)

1. **Un pedido no puede pasar a `pagado` sin al menos un `pago` registrado** con `conciliado=true` (si es electrónico) o método `efectivo`.
2. **Un `turno_caja` cerrado no admite nuevos `pago` ni `movimiento_caja`.**
3. **La suma de `pedido_item.subtotal` debe igualar `pedido.subtotal`** (validación por trigger o aplicación).
4. **Los `pedido_item.producto_nombre`, `precio_unitario` y `modificadores` son snapshots** y no se actualizan si el producto cambia después.
5. **Solo puede haber un `turno_caja` con `estado='abierto'` por cajero a la vez.**
6. **Un `log_auditoria` no puede modificarse ni eliminarse** (trigger `BEFORE UPDATE/DELETE` que lanza excepción).
7. **Un `pago` con método `transfermovil` o `enzona` debe tener `conciliado=false` al crearse** y solo se marca `true` al cierre de caja tras verificación bancaria.
8. **El `efectivo_esperado` de un turno se calcula** como: `fondo_inicial + sum(pagos efectivo) + sum(ingresos_extra) − sum(gastos_menores) − sum(retiros) − sum(devoluciones efectivo)`.

---

## 5. ESTRATEGIA DE SINCRONIZACIÓN LOCAL ↔ NUBE

- **Local-first:** toda operación se escribe primero en la BD local (PostgreSQL en el servidor del negocio).
- **Cola de sincronización:** cada `INSERT/UPDATE` crítico genera un registro en `sincronizacion`.
- **Worker asíncrono:** un proceso en segundo plano envía los cambios a la nube con reintentos exponenciales (1s, 5s, 30s, 2m, 10m…).
- **Resolución de conflictos:** política _last-write-wins_ con `actualizado_en` para maestros; para pedidos/pagos, la nube **nunca sobrescribe** al local (el local es la fuente de verdad operativa).
- **IDs UUID v4** generados en el cliente/local para evitar colisiones al sincronizar.

---

## 6. RESPALDOS Y RETENCIÓN

| Dato                             | Frecuencia de respaldo                  | Retención         |
| :------------------------------- | :-------------------------------------- | :---------------- |
| Base de datos local              | Diario (02:00 AM) + incremental cada 6h | 30 días           |
| Base de datos nube               | Continuo (WAL) + snapshot diario        | 90 días           |
| Logs de auditoría                | Diario                                  | 1 año (inmutable) |
| Archivos (imágenes de productos) | Diario                                  | 30 días           |

---

## 7. SCRIPT DDL DE EJEMPLO (extracto)

```sql
-- Ejemplo mínimo de tablas críticas
CREATE TABLE negocio (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(120) NOT NULL,
  whatsapp_numero VARCHAR(30),
  moneda_principal CHAR(3) NOT NULL DEFAULT 'CUP',
  zona_horaria VARCHAR(50) NOT NULL DEFAULT 'America/Havana',
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE mesa (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zona_id UUID NOT NULL REFERENCES zona(id),
  numero VARCHAR(20) NOT NULL,
  codigo_qr VARCHAR(80) UNIQUE NOT NULL,
  estado VARCHAR(20) NOT NULL DEFAULT 'libre',
  activo BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE pedido (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  negocio_id UUID NOT NULL REFERENCES negocio(id),
  numero_dia INT NOT NULL,
  canal VARCHAR(20) NOT NULL,
  mesa_id UUID REFERENCES mesa(id),
  estado VARCHAR(20) NOT NULL DEFAULT 'nuevo',
  subtotal NUMERIC(12,2) NOT NULL,
  total NUMERIC(12,2) NOT NULL,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_pedido_estado ON pedido (negocio_id, estado, creado_en DESC);

CREATE TABLE log_auditoria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  negocio_id UUID NOT NULL REFERENCES negocio(id),
  usuario_id UUID REFERENCES usuario(id),
  accion VARCHAR(80) NOT NULL,
  entidad VARCHAR(40) NOT NULL,
  entidad_id UUID,
  datos_antes JSONB,
  datos_despues JSONB,
  motivo TEXT,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION log_auditoria_inmutable()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'log_auditoria es append-only';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_log_inmutable
BEFORE UPDATE OR DELETE ON log_auditoria
FOR EACH ROW EXECUTE FUNCTION log_auditoria_inmutable();

---

8. CONSIDERACIONES DE SEGURIDAD

    Cifrado en reposo: PostgreSQL con pgcrypto o cifrado de disco (LUKS) en el servidor local.

    Roles de BD: usuario de aplicación con permisos mínimos (sin DROP, sin TRUNCATE).

    log_auditoria: solo INSERT permitido al usuario de aplicación.

    PIN y contraseñas: almacenados con argon2id; nunca en texto plano.

    Tokens QR: codigo_qr es un UUID aleatorio (no secuencial) para evitar enumeración.

```
