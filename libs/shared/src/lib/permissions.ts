export const PERMISSIONS = {
  PEDIDO_VER: 'pedido.ver',
  PEDIDO_CREAR: 'pedido.crear',
  PEDIDO_CANCELAR: 'pedido.cancelar',
  PEDIDO_DESCUENTO: 'pedido.descuento',
  CAJA_VER: 'caja.ver',
  CAJA_ABRIR: 'caja.abrir',
  CAJA_CERRAR: 'caja.cerrar',
  CAJA_MOVIMIENTO: 'caja.movimiento',
  CAJA_RETIRO: 'caja.retiro',
  PAGO_REGISTRAR: 'pago.registrar',
  PAGO_CONCILIAR: 'pago.conciliar',
  PAGO_ANULAR: 'pago.anular',
  CATALOGO_VER: 'catalogo.ver',
  CATALOGO_GESTIONAR: 'catalogo.gestionar',
  MESA_GESTIONAR: 'mesa.gestionar',
  USUARIO_GESTIONAR: 'usuario.gestionar',
  REPORTE_VER: 'reporte.ver',
  REPORTE_EXPORTAR: 'reporte.exportar',
  AUDITORIA_VER: 'auditoria.ver',
  CONFIGURACION_GESTIONAR: 'configuracion.gestionar',
  REPARTIDOR_VER: 'repartidor.ver',
  REPARTIDOR_ASIGNAR: 'repartidor.asignar',
  REPARTIDOR_LIQUIDAR: 'repartidor.liquidar',
  KDS_VER: 'kds.ver',
  KDS_ACTUALIZAR: 'kds.actualizar',
  PIN_AUTORIZAR: 'pin.autorizar',
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const ROLE_NAMES = [
  'dueno',
  'gerente',
  'cajero',
  'mesero',
  'cocina',
  'repartidor',
] as const;

export type RoleName = (typeof ROLE_NAMES)[number];

export const ROLE_LABELS: Record<RoleName, string> = {
  dueno: 'Dueño',
  gerente: 'Gerente',
  cajero: 'Cajero',
  mesero: 'Mesero',
  cocina: 'Cocina',
  repartidor: 'Repartidor',
};
