export interface AuthUser {
  id: string;
  negocioId: string;
  sucursalId: string;
  nombre: string;
  username: string;
  telefono: string | null;
  rol: string;
  permisos: string[];
  negocio: { id: string; nombre: string; logoUrl: string | null };
  sucursal: { id: string; nombre: string } | null;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: AuthUser;
}

export interface PublicBranding {
  nombre: string;
  logoUrl: string | null;
}

export interface BusinessSettings extends PublicBranding {
  id: string;
  direccion: string | null;
  telefono: string | null;
  whatsappNumero: string | null;
  email: string | null;
  impuestoPorcentaje: string;
  corteDiaHora: string;
  zonaHoraria: string;
}

export interface UpdateBusinessPayload {
  nombre?: string;
  logoUrl?: string | null;
}

export interface DashboardResponse {
  rango: { desde: string; hasta: string };
  resumen: {
    ventasTotales: string;
    pedidosPagados: number;
    ticketPromedio: string;
    pedidosActivos: number;
  };
  ventasPorCanal: Array<{
    canal: string;
    pedidos: number;
    total: string;
  }>;
  ventasPorMetodo: Array<{
    metodo: string;
    pagos: number;
    total: string;
  }>;
  ventasPorHora: Array<{
    hora: number;
    pedidos: number;
    total: string;
  }>;
  productosTop: Array<{
    producto: string;
    cantidad: number;
    total: string;
  }>;
  ventasPorCajero: Array<{
    usuario: string;
    pagos: number;
    total: string;
  }>;
  ventasPorRepartidor: Array<{
    repartidor: string;
    pedidos: number;
    total: string;
  }>;
  cajaAbierta: {
    id: string;
    cajero: string;
    fondoInicial: string;
    abiertoEn: string;
  } | null;
  ultimosPedidos: Array<{
    id: string;
    codigoPublico: string;
    canal: string;
    estadoCumplimiento: string;
    estadoPago: string;
    total: string;
    mesa: string | null;
    creadoEn: string;
  }>;
}
