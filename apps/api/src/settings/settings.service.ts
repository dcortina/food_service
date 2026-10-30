import { Injectable, NotFoundException } from '@nestjs/common';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { AuditService } from '../common/audit/audit.service';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateBusinessDto } from './dto/update-business.dto';

const businessSelect = {
  id: true,
  nombre: true,
  logoUrl: true,
  direccion: true,
  telefono: true,
  whatsappNumero: true,
  email: true,
  impuestoPorcentaje: true,
  corteDiaHora: true,
  zonaHoraria: true,
} satisfies Prisma.NegocioSelect;

@Injectable()
export class SettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async getBusiness(current: AuthenticatedUser) {
    const business = await this.prisma.negocio.findUnique({
      where: { id: current.negocioId },
      select: businessSelect,
    });

    if (!business) {
      throw new NotFoundException('Negocio no encontrado');
    }

    return this.serialize(business);
  }

  async updateBusiness(dto: UpdateBusinessDto, current: AuthenticatedUser) {
    const before = await this.getBusiness(current);
    const data: Prisma.NegocioUpdateInput = {};

    if (dto.nombre !== undefined) {
      data.nombre = dto.nombre;
    }

    if (dto.logoUrl !== undefined) {
      data.logoUrl = dto.logoUrl ? dto.logoUrl : null;
    }

    if (Object.keys(data).length === 0) {
      return before;
    }

    const updated = await this.prisma.negocio.update({
      where: { id: current.negocioId },
      data,
      select: businessSelect,
    });

    await this.audit.log({
      negocioId: current.negocioId,
      usuarioId: current.id,
      accion: 'configuracion.negocio.actualizar',
      entidad: 'negocio',
      entidadId: current.negocioId,
      datosAntes: {
        nombre: before.nombre,
        logoUrl: before.logoUrl,
      } as Prisma.InputJsonValue,
      datosDespues: {
        nombre: updated.nombre,
        logoUrl: updated.logoUrl,
      } as Prisma.InputJsonValue,
    });

    return this.serialize(updated);
  }

  async getPublicBranding() {
    const business = await this.prisma.negocio.findFirst({
      where: { activo: true },
      orderBy: { creadoEn: 'asc' },
      select: { nombre: true, logoUrl: true },
    });

    return business ?? { nombre: 'CaféQR', logoUrl: null };
  }

  private serialize(business: {
    id: string;
    nombre: string;
    logoUrl: string | null;
    direccion: string | null;
    telefono: string | null;
    whatsappNumero: string | null;
    email: string | null;
    impuestoPorcentaje: Prisma.Decimal;
    corteDiaHora: string;
    zonaHoraria: string;
  }) {
    return {
      ...business,
      impuestoPorcentaje: business.impuestoPorcentaje.toFixed(2),
    };
  }
}
