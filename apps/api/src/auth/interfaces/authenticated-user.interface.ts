export interface AuthenticatedUser {
  id: string;
  negocioId: string;
  sucursalId: string;
  rol: string;
  permisos: string[];
}

export interface JwtPayload {
  sub: string;
  negocioId: string;
  sucursalId: string;
  rol: string;
  permisos: string[];
  typ: 'access' | 'pin';
  accion?: string;
  entidadId?: string;
}
