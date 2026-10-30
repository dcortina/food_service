export const ESTADOS_CUMPLIMIENTO = [
  'nuevo',
  'confirmado',
  'en_preparacion',
  'listo',
  'entregado',
  'cancelado',
] as const;

export type EstadoCumplimiento = (typeof ESTADOS_CUMPLIMIENTO)[number];

export const ESTADOS_PAGO_PEDIDO = [
  'pendiente',
  'parcial',
  'pagado',
  'reembolsado',
] as const;

export type EstadoPagoPedido = (typeof ESTADOS_PAGO_PEDIDO)[number];

export const ESTADOS_PAGO = [
  'registrado',
  'verificado',
  'conciliado',
  'anulado',
] as const;

export type EstadoPago = (typeof ESTADOS_PAGO)[number];

export const METODOS_PAGO = ['efectivo', 'transfermovil', 'enzona'] as const;

export type MetodoPago = (typeof METODOS_PAGO)[number];

export const CANALES_PEDIDO = [
  'qr_mesa',
  'mostrador',
  'mesa_mesero',
  'whatsapp',
  'instagram',
  'facebook',
  'domicilio',
  'para_llevar',
] as const;

export type CanalPedido = (typeof CANALES_PEDIDO)[number];

export const TIPOS_SERVICIO = [
  'mesa',
  'mostrador',
  'para_llevar',
  'domicilio',
] as const;

export type TipoServicio = (typeof TIPOS_SERVICIO)[number];

export const ESTADOS_ITEM = ['pendiente', 'en_preparacion', 'listo'] as const;

export type EstadoItem = (typeof ESTADOS_ITEM)[number];

export const ESTADOS_MESA = [
  'libre',
  'ocupada',
  'reservada',
  'inactiva',
] as const;

export type EstadoMesa = (typeof ESTADOS_MESA)[number];

export const TIPOS_MOVIMIENTO_CAJA = [
  'ingreso',
  'retiro',
  'gasto_menor',
  'devolucion_efectivo',
  'propina_efectivo',
  'ajuste',
] as const;

export type TipoMovimientoCaja = (typeof TIPOS_MOVIMIENTO_CAJA)[number];

export const ESTADOS_TURNO = ['abierto', 'cerrado'] as const;

export type EstadoTurno = (typeof ESTADOS_TURNO)[number];

export const TIPOS_MODIFICADOR_GRUPO = ['unico', 'multiple'] as const;

export type TipoModificadorGrupo = (typeof TIPOS_MODIFICADOR_GRUPO)[number];

export const TIPOS_MODIFICADOR = ['agregar', 'quitar', 'nota'] as const;

export type TipoModificador = (typeof TIPOS_MODIFICADOR)[number];

export const ESTADOS_LIQUIDACION = [
  'pendiente',
  'liquidada',
  'con_diferencia',
] as const;

export type EstadoLiquidacion = (typeof ESTADOS_LIQUIDACION)[number];

export const TIPOS_DISPOSITIVO = [
  'pos',
  'kds',
  'impresora',
  'repartidor',
  'admin',
] as const;

export type TipoDispositivo = (typeof TIPOS_DISPOSITIVO)[number];

export const ESTADOS_PRINT_JOB = [
  'pendiente',
  'imprimiendo',
  'impreso',
  'fallido',
] as const;

export type EstadoPrintJob = (typeof ESTADOS_PRINT_JOB)[number];

export const CANAL_PEDIDO_LABELS: Record<CanalPedido, string> = {
  qr_mesa: 'QR en mesa',
  mostrador: 'Mostrador',
  mesa_mesero: 'Mesa (mesero)',
  whatsapp: 'WhatsApp',
  instagram: 'Instagram',
  facebook: 'Facebook',
  domicilio: 'Domicilio',
  para_llevar: 'Para llevar',
};

export const METODO_PAGO_LABELS: Record<MetodoPago, string> = {
  efectivo: 'Efectivo',
  transfermovil: 'Transfermóvil',
  enzona: 'EnZona',
};

export const ESTADO_CUMPLIMIENTO_LABELS: Record<EstadoCumplimiento, string> = {
  nuevo: 'Nuevo',
  confirmado: 'Confirmado',
  en_preparacion: 'En preparación',
  listo: 'Listo',
  entregado: 'Entregado',
  cancelado: 'Cancelado',
};

export const ESTADO_PAGO_LABELS: Record<EstadoPago, string> = {
  registrado: 'Registrado',
  verificado: 'Verificado',
  conciliado: 'Conciliado',
  anulado: 'Anulado',
};
