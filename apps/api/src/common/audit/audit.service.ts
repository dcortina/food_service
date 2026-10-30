import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export interface AuditInput {
  negocioId: string;
  sucursalId?: string | null;
  usuarioId?: string | null;
  accion: string;
  entidad: string;
  entidadId?: string | null;
  datosAntes?: Prisma.InputJsonValue;
  datosDespues?: Prisma.InputJsonValue;
  motivo?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  requestId?: string | null;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async log(input: AuditInput): Promise<void> {
    try {
      await this.prisma.logAuditoria.create({
        data: {
          negocioId: input.negocioId,
          sucursalId: input.sucursalId ?? null,
          usuarioId: input.usuarioId ?? null,
          accion: input.accion,
          entidad: input.entidad,
          entidadId: input.entidadId ?? null,
          datosAntes: input.datosAntes,
          datosDespues: input.datosDespues,
          motivo: input.motivo ?? null,
          ip: input.ip ?? null,
          userAgent: input.userAgent ?? null,
          requestId: input.requestId ?? null,
        },
      });
    } catch (error) {
      this.logger.error('No se pudo escribir el log de auditoría', error);
    }
  }
}
