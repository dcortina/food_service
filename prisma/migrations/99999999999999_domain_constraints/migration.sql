-- Domain constraints that Prisma cannot express in schema.prisma.
-- This migration runs after the initial schema migration.

-- Soft-deleted master data can reuse names/numbers.
CREATE UNIQUE INDEX IF NOT EXISTS usuario_negocio_username_activo_key
  ON usuario (negocio_id, username)
  WHERE activo = true;

CREATE UNIQUE INDEX IF NOT EXISTS mesa_zona_numero_activo_key
  ON mesa (zona_id, numero)
  WHERE activo = true;

CREATE UNIQUE INDEX IF NOT EXISTS zona_sucursal_nombre_activo_key
  ON zona (sucursal_id, nombre)
  WHERE activo = true;

CREATE UNIQUE INDEX IF NOT EXISTS categoria_negocio_nombre_activo_key
  ON categoria (negocio_id, nombre)
  WHERE activo = true;

CREATE UNIQUE INDEX IF NOT EXISTS caja_sucursal_nombre_activo_key
  ON caja (sucursal_id, nombre)
  WHERE activo = true;

-- One open cash shift per physical register.
CREATE UNIQUE INDEX IF NOT EXISTS turno_caja_caja_abierto_key
  ON turno_caja (caja_id)
  WHERE estado = 'abierto';

-- Configuration uniqueness with a nullable branch.
CREATE UNIQUE INDEX IF NOT EXISTS configuracion_negocio_clave_sin_sucursal_key
  ON configuracion (negocio_id, clave)
  WHERE sucursal_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS configuracion_negocio_sucursal_clave_key
  ON configuracion (negocio_id, sucursal_id, clave)
  WHERE sucursal_id IS NOT NULL;

-- Append-only audit log.
CREATE OR REPLACE FUNCTION log_auditoria_inmutable()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'log_auditoria es append-only';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_log_inmutable ON log_auditoria;
CREATE TRIGGER trg_log_inmutable
BEFORE UPDATE OR DELETE ON log_auditoria
FOR EACH ROW EXECUTE FUNCTION log_auditoria_inmutable();
