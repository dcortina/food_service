-- CreateEnum
CREATE TYPE "EstadoCumplimiento" AS ENUM ('nuevo', 'confirmado', 'en_preparacion', 'listo', 'entregado', 'cancelado');

-- CreateEnum
CREATE TYPE "EstadoPagoPedido" AS ENUM ('pendiente', 'parcial', 'pagado', 'reembolsado');

-- CreateEnum
CREATE TYPE "EstadoPago" AS ENUM ('registrado', 'verificado', 'conciliado', 'anulado');

-- CreateEnum
CREATE TYPE "MetodoPago" AS ENUM ('efectivo', 'transfermovil', 'enzona');

-- CreateEnum
CREATE TYPE "CanalPedido" AS ENUM ('qr_mesa', 'mostrador', 'mesa_mesero', 'whatsapp', 'instagram', 'facebook', 'domicilio', 'para_llevar');

-- CreateEnum
CREATE TYPE "TipoServicio" AS ENUM ('mesa', 'mostrador', 'para_llevar', 'domicilio');

-- CreateEnum
CREATE TYPE "EstadoItem" AS ENUM ('pendiente', 'en_preparacion', 'listo');

-- CreateEnum
CREATE TYPE "EstadoMesa" AS ENUM ('libre', 'ocupada', 'reservada', 'inactiva');

-- CreateEnum
CREATE TYPE "TipoMovimientoCaja" AS ENUM ('ingreso', 'retiro', 'gasto_menor', 'devolucion_efectivo', 'propina_efectivo', 'ajuste');

-- CreateEnum
CREATE TYPE "EstadoTurno" AS ENUM ('abierto', 'cerrado');

-- CreateEnum
CREATE TYPE "TipoDenominacion" AS ENUM ('inicial', 'final');

-- CreateEnum
CREATE TYPE "EstadoLiquidacion" AS ENUM ('pendiente', 'liquidada', 'con_diferencia');

-- CreateEnum
CREATE TYPE "TipoModificadorGrupo" AS ENUM ('unico', 'multiple');

-- CreateEnum
CREATE TYPE "TipoModificador" AS ENUM ('agregar', 'quitar', 'nota');

-- CreateEnum
CREATE TYPE "EstadoOutbox" AS ENUM ('pendiente', 'enviado', 'confirmado', 'fallido');

-- CreateEnum
CREATE TYPE "EstadoSesion" AS ENUM ('activa', 'revocada', 'expirada');

-- CreateEnum
CREATE TYPE "TipoDispositivo" AS ENUM ('pos', 'kds', 'impresora', 'repartidor', 'admin');

-- CreateEnum
CREATE TYPE "EstadoPrintJob" AS ENUM ('pendiente', 'imprimiendo', 'impreso', 'fallido');

-- CreateTable
CREATE TABLE "negocio" (
    "id" UUID NOT NULL,
    "nombre" VARCHAR(120) NOT NULL,
    "logo_url" TEXT,
    "direccion" TEXT,
    "telefono" VARCHAR(30),
    "whatsapp_numero" VARCHAR(30),
    "email" VARCHAR(120),
    "moneda_principal_id" UUID NOT NULL,
    "zona_horaria" VARCHAR(50) NOT NULL DEFAULT 'America/Havana',
    "impuesto_porcentaje" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "corte_dia_hora" VARCHAR(5) NOT NULL DEFAULT '04:00',
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creado_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "negocio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sucursal" (
    "id" UUID NOT NULL,
    "negocio_id" UUID NOT NULL,
    "nombre" VARCHAR(120) NOT NULL,
    "direccion" TEXT,
    "telefono" VARCHAR(30),
    "zona_horaria" VARCHAR(50),
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creado_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "sucursal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rol" (
    "id" UUID NOT NULL,
    "nombre" VARCHAR(40) NOT NULL,
    "descripcion" TEXT,
    "es_sistema" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "rol_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permiso" (
    "id" UUID NOT NULL,
    "codigo" VARCHAR(60) NOT NULL,
    "descripcion" TEXT,

    CONSTRAINT "permiso_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rol_permiso" (
    "rol_id" UUID NOT NULL,
    "permiso_id" UUID NOT NULL,

    CONSTRAINT "rol_permiso_pkey" PRIMARY KEY ("rol_id","permiso_id")
);

-- CreateTable
CREATE TABLE "usuario" (
    "id" UUID NOT NULL,
    "negocio_id" UUID NOT NULL,
    "rol_id" UUID NOT NULL,
    "nombre" VARCHAR(120) NOT NULL,
    "username" VARCHAR(60) NOT NULL,
    "password_hash" TEXT NOT NULL,
    "pin_hash" TEXT,
    "telefono" VARCHAR(30),
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "ultimo_acceso" TIMESTAMPTZ(6),
    "creado_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuario_sucursal" (
    "usuario_id" UUID NOT NULL,
    "sucursal_id" UUID NOT NULL,
    "es_principal" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "usuario_sucursal_pkey" PRIMARY KEY ("usuario_id","sucursal_id")
);

-- CreateTable
CREATE TABLE "sesion" (
    "id" UUID NOT NULL,
    "usuario_id" UUID NOT NULL,
    "dispositivo_id" UUID,
    "refresh_hash" TEXT NOT NULL,
    "estado" "EstadoSesion" NOT NULL DEFAULT 'activa',
    "ip" VARCHAR(45),
    "user_agent" VARCHAR(255),
    "expira_en" TIMESTAMPTZ(6) NOT NULL,
    "creado_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revocada_en" TIMESTAMPTZ(6),

    CONSTRAINT "sesion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dispositivo" (
    "id" UUID NOT NULL,
    "negocio_id" UUID NOT NULL,
    "sucursal_id" UUID,
    "nombre" VARCHAR(80) NOT NULL,
    "tipo" "TipoDispositivo" NOT NULL,
    "token_hash" VARCHAR(255),
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "ultima_conexion" TIMESTAMPTZ(6),
    "creado_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dispositivo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categoria" (
    "id" UUID NOT NULL,
    "negocio_id" UUID NOT NULL,
    "nombre" VARCHAR(60) NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "categoria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "producto" (
    "id" UUID NOT NULL,
    "categoria_id" UUID NOT NULL,
    "nombre" VARCHAR(120) NOT NULL,
    "descripcion" TEXT,
    "imagen_url" TEXT,
    "disponible" BOOLEAN NOT NULL DEFAULT true,
    "disponible_desde" VARCHAR(5),
    "disponible_hasta" VARCHAR(5),
    "dias_semana" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "tiempo_preparacion_min" INTEGER NOT NULL DEFAULT 5,
    "impuesto_porcentaje" DECIMAL(5,2),
    "orden" INTEGER NOT NULL DEFAULT 0,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creado_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "producto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "producto_precio" (
    "producto_id" UUID NOT NULL,
    "moneda_id" UUID NOT NULL,
    "precio" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "producto_precio_pkey" PRIMARY KEY ("producto_id","moneda_id")
);

-- CreateTable
CREATE TABLE "grupo_modificador" (
    "id" UUID NOT NULL,
    "negocio_id" UUID NOT NULL,
    "nombre" VARCHAR(60) NOT NULL,
    "tipo" "TipoModificadorGrupo" NOT NULL DEFAULT 'unico',
    "min_seleccion" INTEGER NOT NULL DEFAULT 0,
    "max_seleccion" INTEGER NOT NULL DEFAULT 1,
    "obligatorio" BOOLEAN NOT NULL DEFAULT false,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "grupo_modificador_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "modificador" (
    "id" UUID NOT NULL,
    "grupo_id" UUID NOT NULL,
    "nombre" VARCHAR(60) NOT NULL,
    "tipo" "TipoModificador" NOT NULL DEFAULT 'agregar',
    "precio_extra" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "modificador_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "producto_grupo_modificador" (
    "producto_id" UUID NOT NULL,
    "grupo_id" UUID NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "producto_grupo_modificador_pkey" PRIMARY KEY ("producto_id","grupo_id")
);

-- CreateTable
CREATE TABLE "zona" (
    "id" UUID NOT NULL,
    "sucursal_id" UUID NOT NULL,
    "nombre" VARCHAR(60) NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "zona_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mesa" (
    "id" UUID NOT NULL,
    "zona_id" UUID NOT NULL,
    "numero" VARCHAR(20) NOT NULL,
    "codigo_qr" VARCHAR(80) NOT NULL,
    "capacidad" INTEGER NOT NULL DEFAULT 4,
    "estado" "EstadoMesa" NOT NULL DEFAULT 'libre',
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "mesa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cliente" (
    "id" UUID NOT NULL,
    "negocio_id" UUID NOT NULL,
    "nombre" VARCHAR(120),
    "telefono" VARCHAR(30),
    "direccion" TEXT,
    "notas" TEXT,
    "puntos_lealtad" INTEGER NOT NULL DEFAULT 0,
    "creado_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cliente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pedido" (
    "id" UUID NOT NULL,
    "negocio_id" UUID NOT NULL,
    "sucursal_id" UUID NOT NULL,
    "fecha_operativa" DATE NOT NULL,
    "numero_dia" INTEGER NOT NULL,
    "codigo_publico" VARCHAR(20) NOT NULL,
    "canal" "CanalPedido" NOT NULL,
    "tipo_servicio" "TipoServicio" NOT NULL,
    "mesa_id" UUID,
    "cliente_id" UUID,
    "cliente_nombre" VARCHAR(120),
    "cliente_telefono" VARCHAR(30),
    "direccion_entrega" TEXT,
    "estado_cumplimiento" "EstadoCumplimiento" NOT NULL DEFAULT 'nuevo',
    "estado_pago" "EstadoPagoPedido" NOT NULL DEFAULT 'pendiente',
    "subtotal" DECIMAL(12,2) NOT NULL,
    "descuento" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "impuesto" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(12,2) NOT NULL,
    "moneda_id" UUID NOT NULL,
    "tasa_cambio_aplicada" DECIMAL(12,6) NOT NULL,
    "notas" TEXT,
    "eta_minutos" INTEGER,
    "idempotency_key" VARCHAR(100) NOT NULL,
    "cancelado_motivo" TEXT,
    "cancelado_por_id" UUID,
    "creado_por_id" UUID,
    "creado_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMPTZ(6) NOT NULL,
    "confirmado_en" TIMESTAMPTZ(6),
    "en_preparacion_en" TIMESTAMPTZ(6),
    "listo_en" TIMESTAMPTZ(6),
    "entregado_en" TIMESTAMPTZ(6),
    "pagado_en" TIMESTAMPTZ(6),

    CONSTRAINT "pedido_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pedido_item" (
    "id" UUID NOT NULL,
    "pedido_id" UUID NOT NULL,
    "producto_id" UUID NOT NULL,
    "producto_nombre" VARCHAR(120) NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "precio_unitario" DECIMAL(12,2) NOT NULL,
    "moneda_id" UUID NOT NULL,
    "tasa_cambio_aplicada" DECIMAL(12,6) NOT NULL,
    "subtotal" DECIMAL(12,2) NOT NULL,
    "notas" TEXT,
    "estado_item" "EstadoItem" NOT NULL DEFAULT 'pendiente',
    "orden" INTEGER NOT NULL DEFAULT 0,
    "en_preparacion_en" TIMESTAMPTZ(6),
    "listo_en" TIMESTAMPTZ(6),

    CONSTRAINT "pedido_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pedido_item_modificador" (
    "id" UUID NOT NULL,
    "pedido_item_id" UUID NOT NULL,
    "modificador_id" UUID,
    "nombre" VARCHAR(60) NOT NULL,
    "tipo" "TipoModificador" NOT NULL,
    "precio_extra" DECIMAL(12,2) NOT NULL DEFAULT 0,

    CONSTRAINT "pedido_item_modificador_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pago" (
    "id" UUID NOT NULL,
    "negocio_id" UUID NOT NULL,
    "sucursal_id" UUID NOT NULL,
    "pedido_id" UUID NOT NULL,
    "turno_caja_id" UUID,
    "liquidacion_id" UUID,
    "metodo" "MetodoPago" NOT NULL,
    "estado" "EstadoPago" NOT NULL DEFAULT 'registrado',
    "monto" DECIMAL(12,2) NOT NULL,
    "moneda_id" UUID NOT NULL,
    "tasa_cambio_aplicada" DECIMAL(12,6) NOT NULL,
    "monto_recibido" DECIMAL(12,2),
    "cambio" DECIMAL(12,2),
    "referencia_externa" VARCHAR(100),
    "idempotency_key" VARCHAR(100) NOT NULL,
    "conciliado_en" TIMESTAMPTZ(6),
    "conciliado_por_id" UUID,
    "anulado_motivo" TEXT,
    "anulado_por_id" UUID,
    "anulado_en" TIMESTAMPTZ(6),
    "creado_por_id" UUID NOT NULL,
    "creado_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pago_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "caja" (
    "id" UUID NOT NULL,
    "sucursal_id" UUID NOT NULL,
    "nombre" VARCHAR(60) NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "caja_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "turno_caja" (
    "id" UUID NOT NULL,
    "negocio_id" UUID NOT NULL,
    "sucursal_id" UUID NOT NULL,
    "caja_id" UUID NOT NULL,
    "cajero_id" UUID NOT NULL,
    "fecha_operativa" DATE NOT NULL,
    "fondo_inicial" DECIMAL(12,2) NOT NULL,
    "estado" "EstadoTurno" NOT NULL DEFAULT 'abierto',
    "abierto_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cerrado_en" TIMESTAMPTZ(6),
    "efectivo_esperado" DECIMAL(12,2),
    "efectivo_contado" DECIMAL(12,2),
    "descuadre" DECIMAL(12,2),
    "total_electronico_reportado" DECIMAL(12,2),
    "total_electronico_conciliado" DECIMAL(12,2),
    "observaciones" TEXT,
    "autorizado_por_id" UUID,

    CONSTRAINT "turno_caja_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "turno_caja_denominacion" (
    "id" UUID NOT NULL,
    "turno_caja_id" UUID NOT NULL,
    "tipo" "TipoDenominacion" NOT NULL,
    "denominacion" DECIMAL(12,2) NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "subtotal" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "turno_caja_denominacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "movimiento_caja" (
    "id" UUID NOT NULL,
    "turno_caja_id" UUID NOT NULL,
    "tipo" "TipoMovimientoCaja" NOT NULL,
    "monto" DECIMAL(12,2) NOT NULL,
    "motivo" TEXT NOT NULL,
    "autorizado_por_id" UUID,
    "creado_por_id" UUID NOT NULL,
    "creado_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "movimiento_caja_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "repartidor" (
    "id" UUID NOT NULL,
    "usuario_id" UUID NOT NULL,
    "vehiculo" VARCHAR(40),
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "repartidor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asignacion_repartidor" (
    "id" UUID NOT NULL,
    "pedido_id" UUID NOT NULL,
    "repartidor_id" UUID NOT NULL,
    "asignado_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "salida_en" TIMESTAMPTZ(6),
    "entregado_en" TIMESTAMPTZ(6),
    "efectivo_cobrado" DECIMAL(12,2),
    "liquidacion_id" UUID,

    CONSTRAINT "asignacion_repartidor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "liquidacion_repartidor" (
    "id" UUID NOT NULL,
    "negocio_id" UUID NOT NULL,
    "sucursal_id" UUID NOT NULL,
    "repartidor_id" UUID NOT NULL,
    "turno_caja_id" UUID,
    "fecha_operativa" DATE NOT NULL,
    "total_cobrado" DECIMAL(12,2) NOT NULL,
    "total_entregado" DECIMAL(12,2) NOT NULL,
    "diferencia" DECIMAL(12,2) NOT NULL,
    "estado" "EstadoLiquidacion" NOT NULL DEFAULT 'pendiente',
    "observaciones" TEXT,
    "creado_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cerrada_en" TIMESTAMPTZ(6),

    CONSTRAINT "liquidacion_repartidor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "moneda" (
    "id" UUID NOT NULL,
    "codigo" CHAR(3) NOT NULL,
    "nombre" VARCHAR(40) NOT NULL,
    "simbolo" VARCHAR(5),
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "moneda_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tasa_cambio" (
    "id" UUID NOT NULL,
    "negocio_id" UUID NOT NULL,
    "moneda_origen_id" UUID NOT NULL,
    "moneda_destino_id" UUID NOT NULL,
    "tasa" DECIMAL(12,6) NOT NULL,
    "vigente_desde" TIMESTAMPTZ(6) NOT NULL,
    "vigente_hasta" TIMESTAMPTZ(6),
    "creado_por_id" UUID NOT NULL,
    "creado_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tasa_cambio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "log_auditoria" (
    "id" UUID NOT NULL,
    "negocio_id" UUID NOT NULL,
    "sucursal_id" UUID,
    "usuario_id" UUID,
    "accion" VARCHAR(80) NOT NULL,
    "entidad" VARCHAR(40) NOT NULL,
    "entidad_id" UUID,
    "datos_antes" JSONB,
    "datos_despues" JSONB,
    "motivo" TEXT,
    "ip" VARCHAR(45),
    "user_agent" VARCHAR(255),
    "request_id" VARCHAR(80),
    "creado_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "log_auditoria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "configuracion" (
    "id" UUID NOT NULL,
    "negocio_id" UUID NOT NULL,
    "sucursal_id" UUID,
    "clave" VARCHAR(60) NOT NULL,
    "valor" JSONB NOT NULL,
    "actualizado_en" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "configuracion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contador_diario" (
    "id" UUID NOT NULL,
    "sucursal_id" UUID NOT NULL,
    "fecha_operativa" DATE NOT NULL,
    "ultimo_numero" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "contador_diario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outbox_event" (
    "id" UUID NOT NULL,
    "secuencia" BIGSERIAL NOT NULL,
    "negocio_id" UUID NOT NULL,
    "sucursal_id" UUID,
    "aggregate_type" VARCHAR(40) NOT NULL,
    "aggregate_id" UUID NOT NULL,
    "event_type" VARCHAR(80) NOT NULL,
    "payload" JSONB NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "estado" "EstadoOutbox" NOT NULL DEFAULT 'pendiente',
    "intentos" INTEGER NOT NULL DEFAULT 0,
    "ultimo_error" TEXT,
    "disponible_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "creado_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "procesado_en" TIMESTAMPTZ(6),

    CONSTRAINT "outbox_event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "print_job" (
    "id" UUID NOT NULL,
    "negocio_id" UUID NOT NULL,
    "sucursal_id" UUID NOT NULL,
    "pedido_id" UUID,
    "dispositivo_id" UUID,
    "tipo" VARCHAR(30) NOT NULL,
    "payload" JSONB NOT NULL,
    "estado" "EstadoPrintJob" NOT NULL DEFAULT 'pendiente',
    "intentos" INTEGER NOT NULL DEFAULT 0,
    "ultimo_error" TEXT,
    "creado_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "impreso_en" TIMESTAMPTZ(6),

    CONSTRAINT "print_job_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "sucursal_negocio_id_activo_idx" ON "sucursal"("negocio_id", "activo");

-- CreateIndex
CREATE UNIQUE INDEX "rol_nombre_key" ON "rol"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "permiso_codigo_key" ON "permiso"("codigo");

-- CreateIndex
CREATE INDEX "usuario_negocio_id_username_idx" ON "usuario"("negocio_id", "username");

-- CreateIndex
CREATE INDEX "usuario_negocio_id_activo_idx" ON "usuario"("negocio_id", "activo");

-- CreateIndex
CREATE UNIQUE INDEX "sesion_refresh_hash_key" ON "sesion"("refresh_hash");

-- CreateIndex
CREATE INDEX "sesion_usuario_id_estado_idx" ON "sesion"("usuario_id", "estado");

-- CreateIndex
CREATE INDEX "dispositivo_negocio_id_tipo_activo_idx" ON "dispositivo"("negocio_id", "tipo", "activo");

-- CreateIndex
CREATE INDEX "categoria_negocio_id_nombre_idx" ON "categoria"("negocio_id", "nombre");

-- CreateIndex
CREATE INDEX "producto_categoria_id_activo_orden_idx" ON "producto"("categoria_id", "activo", "orden");

-- CreateIndex
CREATE INDEX "grupo_modificador_negocio_id_activo_orden_idx" ON "grupo_modificador"("negocio_id", "activo", "orden");

-- CreateIndex
CREATE INDEX "modificador_grupo_id_activo_orden_idx" ON "modificador"("grupo_id", "activo", "orden");

-- CreateIndex
CREATE INDEX "zona_sucursal_id_nombre_idx" ON "zona"("sucursal_id", "nombre");

-- CreateIndex
CREATE UNIQUE INDEX "mesa_codigo_qr_key" ON "mesa"("codigo_qr");

-- CreateIndex
CREATE INDEX "mesa_zona_id_numero_idx" ON "mesa"("zona_id", "numero");

-- CreateIndex
CREATE INDEX "mesa_zona_id_activo_idx" ON "mesa"("zona_id", "activo");

-- CreateIndex
CREATE INDEX "cliente_negocio_id_telefono_idx" ON "cliente"("negocio_id", "telefono");

-- CreateIndex
CREATE INDEX "pedido_negocio_id_estado_cumplimiento_creado_en_idx" ON "pedido"("negocio_id", "estado_cumplimiento", "creado_en");

-- CreateIndex
CREATE INDEX "pedido_negocio_id_canal_creado_en_idx" ON "pedido"("negocio_id", "canal", "creado_en");

-- CreateIndex
CREATE INDEX "pedido_mesa_id_estado_cumplimiento_idx" ON "pedido"("mesa_id", "estado_cumplimiento");

-- CreateIndex
CREATE UNIQUE INDEX "pedido_sucursal_id_fecha_operativa_numero_dia_key" ON "pedido"("sucursal_id", "fecha_operativa", "numero_dia");

-- CreateIndex
CREATE UNIQUE INDEX "pedido_sucursal_id_fecha_operativa_codigo_publico_key" ON "pedido"("sucursal_id", "fecha_operativa", "codigo_publico");

-- CreateIndex
CREATE UNIQUE INDEX "pedido_negocio_id_idempotency_key_key" ON "pedido"("negocio_id", "idempotency_key");

-- CreateIndex
CREATE INDEX "pedido_item_pedido_id_orden_idx" ON "pedido_item"("pedido_id", "orden");

-- CreateIndex
CREATE INDEX "pedido_item_modificador_pedido_item_id_idx" ON "pedido_item_modificador"("pedido_item_id");

-- CreateIndex
CREATE INDEX "pago_pedido_id_estado_idx" ON "pago"("pedido_id", "estado");

-- CreateIndex
CREATE INDEX "pago_turno_caja_id_metodo_estado_idx" ON "pago"("turno_caja_id", "metodo", "estado");

-- CreateIndex
CREATE UNIQUE INDEX "pago_negocio_id_idempotency_key_key" ON "pago"("negocio_id", "idempotency_key");

-- CreateIndex
CREATE INDEX "caja_sucursal_id_nombre_idx" ON "caja"("sucursal_id", "nombre");

-- CreateIndex
CREATE INDEX "turno_caja_sucursal_id_estado_fecha_operativa_idx" ON "turno_caja"("sucursal_id", "estado", "fecha_operativa");

-- CreateIndex
CREATE INDEX "turno_caja_cajero_id_estado_idx" ON "turno_caja"("cajero_id", "estado");

-- CreateIndex
CREATE INDEX "turno_caja_denominacion_turno_caja_id_tipo_idx" ON "turno_caja_denominacion"("turno_caja_id", "tipo");

-- CreateIndex
CREATE INDEX "movimiento_caja_turno_caja_id_tipo_idx" ON "movimiento_caja"("turno_caja_id", "tipo");

-- CreateIndex
CREATE UNIQUE INDEX "repartidor_usuario_id_key" ON "repartidor"("usuario_id");

-- CreateIndex
CREATE INDEX "asignacion_repartidor_repartidor_id_liquidacion_id_idx" ON "asignacion_repartidor"("repartidor_id", "liquidacion_id");

-- CreateIndex
CREATE INDEX "asignacion_repartidor_pedido_id_idx" ON "asignacion_repartidor"("pedido_id");

-- CreateIndex
CREATE INDEX "liquidacion_repartidor_sucursal_id_fecha_operativa_estado_idx" ON "liquidacion_repartidor"("sucursal_id", "fecha_operativa", "estado");

-- CreateIndex
CREATE UNIQUE INDEX "moneda_codigo_key" ON "moneda"("codigo");

-- CreateIndex
CREATE INDEX "tasa_cambio_negocio_id_moneda_origen_id_moneda_destino_id_v_idx" ON "tasa_cambio"("negocio_id", "moneda_origen_id", "moneda_destino_id", "vigente_desde");

-- CreateIndex
CREATE INDEX "log_auditoria_negocio_id_creado_en_idx" ON "log_auditoria"("negocio_id", "creado_en");

-- CreateIndex
CREATE INDEX "log_auditoria_entidad_entidad_id_idx" ON "log_auditoria"("entidad", "entidad_id");

-- CreateIndex
CREATE INDEX "configuracion_negocio_id_sucursal_id_clave_idx" ON "configuracion"("negocio_id", "sucursal_id", "clave");

-- CreateIndex
CREATE UNIQUE INDEX "contador_diario_sucursal_id_fecha_operativa_key" ON "contador_diario"("sucursal_id", "fecha_operativa");

-- CreateIndex
CREATE UNIQUE INDEX "outbox_event_secuencia_key" ON "outbox_event"("secuencia");

-- CreateIndex
CREATE INDEX "outbox_event_estado_disponible_en_idx" ON "outbox_event"("estado", "disponible_en");

-- CreateIndex
CREATE INDEX "outbox_event_aggregate_type_aggregate_id_idx" ON "outbox_event"("aggregate_type", "aggregate_id");

-- CreateIndex
CREATE INDEX "print_job_estado_creado_en_idx" ON "print_job"("estado", "creado_en");

-- AddForeignKey
ALTER TABLE "negocio" ADD CONSTRAINT "negocio_moneda_principal_id_fkey" FOREIGN KEY ("moneda_principal_id") REFERENCES "moneda"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sucursal" ADD CONSTRAINT "sucursal_negocio_id_fkey" FOREIGN KEY ("negocio_id") REFERENCES "negocio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rol_permiso" ADD CONSTRAINT "rol_permiso_rol_id_fkey" FOREIGN KEY ("rol_id") REFERENCES "rol"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rol_permiso" ADD CONSTRAINT "rol_permiso_permiso_id_fkey" FOREIGN KEY ("permiso_id") REFERENCES "permiso"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuario" ADD CONSTRAINT "usuario_negocio_id_fkey" FOREIGN KEY ("negocio_id") REFERENCES "negocio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuario" ADD CONSTRAINT "usuario_rol_id_fkey" FOREIGN KEY ("rol_id") REFERENCES "rol"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuario_sucursal" ADD CONSTRAINT "usuario_sucursal_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuario_sucursal" ADD CONSTRAINT "usuario_sucursal_sucursal_id_fkey" FOREIGN KEY ("sucursal_id") REFERENCES "sucursal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sesion" ADD CONSTRAINT "sesion_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sesion" ADD CONSTRAINT "sesion_dispositivo_id_fkey" FOREIGN KEY ("dispositivo_id") REFERENCES "dispositivo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispositivo" ADD CONSTRAINT "dispositivo_negocio_id_fkey" FOREIGN KEY ("negocio_id") REFERENCES "negocio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispositivo" ADD CONSTRAINT "dispositivo_sucursal_id_fkey" FOREIGN KEY ("sucursal_id") REFERENCES "sucursal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categoria" ADD CONSTRAINT "categoria_negocio_id_fkey" FOREIGN KEY ("negocio_id") REFERENCES "negocio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "producto" ADD CONSTRAINT "producto_categoria_id_fkey" FOREIGN KEY ("categoria_id") REFERENCES "categoria"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "producto_precio" ADD CONSTRAINT "producto_precio_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "producto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "producto_precio" ADD CONSTRAINT "producto_precio_moneda_id_fkey" FOREIGN KEY ("moneda_id") REFERENCES "moneda"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grupo_modificador" ADD CONSTRAINT "grupo_modificador_negocio_id_fkey" FOREIGN KEY ("negocio_id") REFERENCES "negocio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "modificador" ADD CONSTRAINT "modificador_grupo_id_fkey" FOREIGN KEY ("grupo_id") REFERENCES "grupo_modificador"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "producto_grupo_modificador" ADD CONSTRAINT "producto_grupo_modificador_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "producto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "producto_grupo_modificador" ADD CONSTRAINT "producto_grupo_modificador_grupo_id_fkey" FOREIGN KEY ("grupo_id") REFERENCES "grupo_modificador"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zona" ADD CONSTRAINT "zona_sucursal_id_fkey" FOREIGN KEY ("sucursal_id") REFERENCES "sucursal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mesa" ADD CONSTRAINT "mesa_zona_id_fkey" FOREIGN KEY ("zona_id") REFERENCES "zona"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cliente" ADD CONSTRAINT "cliente_negocio_id_fkey" FOREIGN KEY ("negocio_id") REFERENCES "negocio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedido" ADD CONSTRAINT "pedido_negocio_id_fkey" FOREIGN KEY ("negocio_id") REFERENCES "negocio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedido" ADD CONSTRAINT "pedido_sucursal_id_fkey" FOREIGN KEY ("sucursal_id") REFERENCES "sucursal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedido" ADD CONSTRAINT "pedido_mesa_id_fkey" FOREIGN KEY ("mesa_id") REFERENCES "mesa"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedido" ADD CONSTRAINT "pedido_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "cliente"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedido" ADD CONSTRAINT "pedido_moneda_id_fkey" FOREIGN KEY ("moneda_id") REFERENCES "moneda"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedido" ADD CONSTRAINT "pedido_cancelado_por_id_fkey" FOREIGN KEY ("cancelado_por_id") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedido" ADD CONSTRAINT "pedido_creado_por_id_fkey" FOREIGN KEY ("creado_por_id") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedido_item" ADD CONSTRAINT "pedido_item_pedido_id_fkey" FOREIGN KEY ("pedido_id") REFERENCES "pedido"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedido_item" ADD CONSTRAINT "pedido_item_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "producto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedido_item" ADD CONSTRAINT "pedido_item_moneda_id_fkey" FOREIGN KEY ("moneda_id") REFERENCES "moneda"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedido_item_modificador" ADD CONSTRAINT "pedido_item_modificador_pedido_item_id_fkey" FOREIGN KEY ("pedido_item_id") REFERENCES "pedido_item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedido_item_modificador" ADD CONSTRAINT "pedido_item_modificador_modificador_id_fkey" FOREIGN KEY ("modificador_id") REFERENCES "modificador"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pago" ADD CONSTRAINT "pago_negocio_id_fkey" FOREIGN KEY ("negocio_id") REFERENCES "negocio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pago" ADD CONSTRAINT "pago_sucursal_id_fkey" FOREIGN KEY ("sucursal_id") REFERENCES "sucursal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pago" ADD CONSTRAINT "pago_pedido_id_fkey" FOREIGN KEY ("pedido_id") REFERENCES "pedido"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pago" ADD CONSTRAINT "pago_turno_caja_id_fkey" FOREIGN KEY ("turno_caja_id") REFERENCES "turno_caja"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pago" ADD CONSTRAINT "pago_liquidacion_id_fkey" FOREIGN KEY ("liquidacion_id") REFERENCES "liquidacion_repartidor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pago" ADD CONSTRAINT "pago_moneda_id_fkey" FOREIGN KEY ("moneda_id") REFERENCES "moneda"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pago" ADD CONSTRAINT "pago_conciliado_por_id_fkey" FOREIGN KEY ("conciliado_por_id") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pago" ADD CONSTRAINT "pago_anulado_por_id_fkey" FOREIGN KEY ("anulado_por_id") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pago" ADD CONSTRAINT "pago_creado_por_id_fkey" FOREIGN KEY ("creado_por_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "caja" ADD CONSTRAINT "caja_sucursal_id_fkey" FOREIGN KEY ("sucursal_id") REFERENCES "sucursal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "turno_caja" ADD CONSTRAINT "turno_caja_negocio_id_fkey" FOREIGN KEY ("negocio_id") REFERENCES "negocio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "turno_caja" ADD CONSTRAINT "turno_caja_sucursal_id_fkey" FOREIGN KEY ("sucursal_id") REFERENCES "sucursal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "turno_caja" ADD CONSTRAINT "turno_caja_caja_id_fkey" FOREIGN KEY ("caja_id") REFERENCES "caja"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "turno_caja" ADD CONSTRAINT "turno_caja_cajero_id_fkey" FOREIGN KEY ("cajero_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "turno_caja" ADD CONSTRAINT "turno_caja_autorizado_por_id_fkey" FOREIGN KEY ("autorizado_por_id") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "turno_caja_denominacion" ADD CONSTRAINT "turno_caja_denominacion_turno_caja_id_fkey" FOREIGN KEY ("turno_caja_id") REFERENCES "turno_caja"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimiento_caja" ADD CONSTRAINT "movimiento_caja_turno_caja_id_fkey" FOREIGN KEY ("turno_caja_id") REFERENCES "turno_caja"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimiento_caja" ADD CONSTRAINT "movimiento_caja_autorizado_por_id_fkey" FOREIGN KEY ("autorizado_por_id") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimiento_caja" ADD CONSTRAINT "movimiento_caja_creado_por_id_fkey" FOREIGN KEY ("creado_por_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repartidor" ADD CONSTRAINT "repartidor_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asignacion_repartidor" ADD CONSTRAINT "asignacion_repartidor_pedido_id_fkey" FOREIGN KEY ("pedido_id") REFERENCES "pedido"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asignacion_repartidor" ADD CONSTRAINT "asignacion_repartidor_repartidor_id_fkey" FOREIGN KEY ("repartidor_id") REFERENCES "repartidor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asignacion_repartidor" ADD CONSTRAINT "asignacion_repartidor_liquidacion_id_fkey" FOREIGN KEY ("liquidacion_id") REFERENCES "liquidacion_repartidor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "liquidacion_repartidor" ADD CONSTRAINT "liquidacion_repartidor_negocio_id_fkey" FOREIGN KEY ("negocio_id") REFERENCES "negocio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "liquidacion_repartidor" ADD CONSTRAINT "liquidacion_repartidor_sucursal_id_fkey" FOREIGN KEY ("sucursal_id") REFERENCES "sucursal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "liquidacion_repartidor" ADD CONSTRAINT "liquidacion_repartidor_repartidor_id_fkey" FOREIGN KEY ("repartidor_id") REFERENCES "repartidor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "liquidacion_repartidor" ADD CONSTRAINT "liquidacion_repartidor_turno_caja_id_fkey" FOREIGN KEY ("turno_caja_id") REFERENCES "turno_caja"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasa_cambio" ADD CONSTRAINT "tasa_cambio_negocio_id_fkey" FOREIGN KEY ("negocio_id") REFERENCES "negocio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasa_cambio" ADD CONSTRAINT "tasa_cambio_moneda_origen_id_fkey" FOREIGN KEY ("moneda_origen_id") REFERENCES "moneda"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasa_cambio" ADD CONSTRAINT "tasa_cambio_moneda_destino_id_fkey" FOREIGN KEY ("moneda_destino_id") REFERENCES "moneda"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasa_cambio" ADD CONSTRAINT "tasa_cambio_creado_por_id_fkey" FOREIGN KEY ("creado_por_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "log_auditoria" ADD CONSTRAINT "log_auditoria_negocio_id_fkey" FOREIGN KEY ("negocio_id") REFERENCES "negocio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "log_auditoria" ADD CONSTRAINT "log_auditoria_sucursal_id_fkey" FOREIGN KEY ("sucursal_id") REFERENCES "sucursal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "log_auditoria" ADD CONSTRAINT "log_auditoria_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "configuracion" ADD CONSTRAINT "configuracion_negocio_id_fkey" FOREIGN KEY ("negocio_id") REFERENCES "negocio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "configuracion" ADD CONSTRAINT "configuracion_sucursal_id_fkey" FOREIGN KEY ("sucursal_id") REFERENCES "sucursal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contador_diario" ADD CONSTRAINT "contador_diario_sucursal_id_fkey" FOREIGN KEY ("sucursal_id") REFERENCES "sucursal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outbox_event" ADD CONSTRAINT "outbox_event_negocio_id_fkey" FOREIGN KEY ("negocio_id") REFERENCES "negocio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outbox_event" ADD CONSTRAINT "outbox_event_sucursal_id_fkey" FOREIGN KEY ("sucursal_id") REFERENCES "sucursal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "print_job" ADD CONSTRAINT "print_job_negocio_id_fkey" FOREIGN KEY ("negocio_id") REFERENCES "negocio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "print_job" ADD CONSTRAINT "print_job_sucursal_id_fkey" FOREIGN KEY ("sucursal_id") REFERENCES "sucursal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "print_job" ADD CONSTRAINT "print_job_pedido_id_fkey" FOREIGN KEY ("pedido_id") REFERENCES "pedido"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "print_job" ADD CONSTRAINT "print_job_dispositivo_id_fkey" FOREIGN KEY ("dispositivo_id") REFERENCES "dispositivo"("id") ON DELETE SET NULL ON UPDATE CASCADE;
