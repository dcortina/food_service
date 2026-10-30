import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import * as QRCode from 'qrcode';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { AuditService } from '../common/audit/audit.service';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateTableDto,
  ListTablesQueryDto,
  UpdateTableDto,
} from './dto/table.dto';
import { CreateZoneDto, UpdateZoneDto } from './dto/zone.dto';

const tableInclude = {
  zona: true,
} satisfies Prisma.MesaInclude;

@Injectable()
export class TablesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly audit: AuditService,
  ) {}

  async listZones(current: AuthenticatedUser) {
    const zones = await this.prisma.zona.findMany({
      where: { sucursalId: current.sucursalId, activo: true },
      orderBy: { nombre: 'asc' },
      include: {
        mesas: {
          where: { activo: true },
          orderBy: { numero: 'asc' },
        },
      },
    });

    return zones.map((zone) => ({
      id: zone.id,
      sucursalId: zone.sucursalId,
      nombre: zone.nombre,
      activo: zone.activo,
      mesas: zone.mesas.map((table) => this.mapTable(table, zone)),
    }));
  }

  async createZone(dto: CreateZoneDto, current: AuthenticatedUser) {
    const existing = await this.prisma.zona.findFirst({
      where: {
        sucursalId: current.sucursalId,
        nombre: dto.nombre,
        activo: true,
      },
    });

    if (existing) {
      throw new ConflictException('La zona ya existe');
    }

    const zone = await this.prisma.zona.create({
      data: {
        sucursalId: current.sucursalId,
        nombre: dto.nombre,
        activo: dto.activo ?? true,
      },
    });

    await this.audit.log({
      negocioId: current.negocioId,
      sucursalId: current.sucursalId,
      usuarioId: current.id,
      accion: 'mesa.zona.crear',
      entidad: 'zona',
      entidadId: zone.id,
      datosDespues: this.auditPayload(zone),
    });

    return zone;
  }

  async updateZone(
    id: string,
    dto: UpdateZoneDto,
    current: AuthenticatedUser,
  ) {
    const existing = await this.prisma.zona.findFirst({
      where: { id, sucursalId: current.sucursalId },
    });

    if (!existing) {
      throw new NotFoundException('Zona no encontrada');
    }

    if (dto.nombre && dto.nombre !== existing.nombre) {
      const duplicate = await this.prisma.zona.findFirst({
        where: {
          sucursalId: current.sucursalId,
          nombre: dto.nombre,
          activo: true,
          id: { not: id },
        },
      });

      if (duplicate) {
        throw new ConflictException('La zona ya existe');
      }
    }

    const zone = await this.prisma.zona.update({
      where: { id },
      data: {
        ...(dto.nombre !== undefined ? { nombre: dto.nombre } : {}),
        ...(dto.activo !== undefined ? { activo: dto.activo } : {}),
      },
    });

    await this.audit.log({
      negocioId: current.negocioId,
      sucursalId: current.sucursalId,
      usuarioId: current.id,
      accion: 'mesa.zona.actualizar',
      entidad: 'zona',
      entidadId: id,
      datosAntes: this.auditPayload(existing),
      datosDespues: this.auditPayload(zone),
    });

    return zone;
  }

  async listTables(query: ListTablesQueryDto, current: AuthenticatedUser) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 50;
    const where: Prisma.MesaWhereInput = {
      zona: { sucursalId: current.sucursalId },
      activo: query.activo !== undefined ? query.activo === 'true' : true,
      ...(query.zonaId ? { zonaId: query.zonaId } : {}),
      ...(query.estado ? { estado: query.estado } : {}),
    };

    const [total, tables] = await this.prisma.$transaction([
      this.prisma.mesa.count({ where }),
      this.prisma.mesa.findMany({
        where,
        include: tableInclude,
        orderBy: { numero: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return {
      data: tables.map((table) => this.mapTable(table, table.zona)),
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async findTable(id: string, current: AuthenticatedUser) {
    const table = await this.prisma.mesa.findFirst({
      where: { id, zona: { sucursalId: current.sucursalId } },
      include: tableInclude,
    });

    if (!table) {
      throw new NotFoundException('Mesa no encontrada');
    }

    return this.mapTable(table, table.zona);
  }

  async createTable(dto: CreateTableDto, current: AuthenticatedUser) {
    const zone = await this.prisma.zona.findFirst({
      where: {
        id: dto.zonaId,
        sucursalId: current.sucursalId,
        activo: true,
      },
    });

    if (!zone) {
      throw new NotFoundException('Zona no encontrada');
    }

    const duplicate = await this.prisma.mesa.findFirst({
      where: {
        zonaId: dto.zonaId,
        numero: dto.numero,
        activo: true,
      },
    });

    if (duplicate) {
      throw new ConflictException('La mesa ya existe en la zona');
    }

    const table = await this.prisma.mesa.create({
      data: {
        zonaId: dto.zonaId,
        numero: dto.numero,
        codigoQr: randomUUID(),
        capacidad: dto.capacidad ?? 4,
        estado: dto.estado ?? 'libre',
        activo: dto.activo ?? true,
      },
      include: tableInclude,
    });

    await this.audit.log({
      negocioId: current.negocioId,
      sucursalId: current.sucursalId,
      usuarioId: current.id,
      accion: 'mesa.crear',
      entidad: 'mesa',
      entidadId: table.id,
      datosDespues: this.auditPayload(
        this.mapTable(table, table.zona),
      ),
    });

    return this.mapTable(table, table.zona);
  }

  async updateTable(
    id: string,
    dto: UpdateTableDto,
    current: AuthenticatedUser,
  ) {
    const existing = await this.prisma.mesa.findFirst({
      where: { id, zona: { sucursalId: current.sucursalId } },
      include: tableInclude,
    });

    if (!existing) {
      throw new NotFoundException('Mesa no encontrada');
    }

    if (dto.zonaId && dto.zonaId !== existing.zonaId) {
      const zone = await this.prisma.zona.findFirst({
        where: {
          id: dto.zonaId,
          sucursalId: current.sucursalId,
          activo: true,
        },
      });

      if (!zone) {
        throw new NotFoundException('Zona no encontrada');
      }
    }

    if (dto.numero && (dto.numero !== existing.numero || dto.zonaId)) {
      const duplicate = await this.prisma.mesa.findFirst({
        where: {
          zonaId: dto.zonaId ?? existing.zonaId,
          numero: dto.numero,
          activo: true,
          id: { not: id },
        },
      });

      if (duplicate) {
        throw new ConflictException('La mesa ya existe en la zona');
      }
    }

    const table = await this.prisma.mesa.update({
      where: { id },
      data: {
        ...(dto.zonaId !== undefined
          ? { zona: { connect: { id: dto.zonaId } } }
          : {}),
        ...(dto.numero !== undefined ? { numero: dto.numero } : {}),
        ...(dto.capacidad !== undefined
          ? { capacidad: dto.capacidad }
          : {}),
        ...(dto.estado !== undefined ? { estado: dto.estado } : {}),
        ...(dto.activo !== undefined ? { activo: dto.activo } : {}),
      },
      include: tableInclude,
    });

    await this.audit.log({
      negocioId: current.negocioId,
      sucursalId: current.sucursalId,
      usuarioId: current.id,
      accion: 'mesa.actualizar',
      entidad: 'mesa',
      entidadId: id,
      datosAntes: this.auditPayload(
        this.mapTable(existing, existing.zona),
      ),
      datosDespues: this.auditPayload(
        this.mapTable(table, table.zona),
      ),
    });

    return this.mapTable(table, table.zona);
  }

  async regenerateQr(id: string, current: AuthenticatedUser) {
    const existing = await this.prisma.mesa.findFirst({
      where: { id, zona: { sucursalId: current.sucursalId } },
      include: tableInclude,
    });

    if (!existing) {
      throw new NotFoundException('Mesa no encontrada');
    }

    const table = await this.prisma.mesa.update({
      where: { id },
      data: { codigoQr: randomUUID() },
      include: tableInclude,
    });

    await this.audit.log({
      negocioId: current.negocioId,
      sucursalId: current.sucursalId,
      usuarioId: current.id,
      accion: 'mesa.qr.regenerar',
      entidad: 'mesa',
      entidadId: id,
      datosAntes: this.auditPayload(
        this.mapTable(existing, existing.zona),
      ),
      datosDespues: this.auditPayload(
        this.mapTable(table, table.zona),
      ),
    });

    return this.mapTable(table, table.zona);
  }

  async getQr(id: string, current: AuthenticatedUser) {
    const table = await this.prisma.mesa.findFirst({
      where: { id, zona: { sucursalId: current.sucursalId } },
    });

    if (!table) {
      throw new NotFoundException('Mesa no encontrada');
    }

    return {
      id: table.id,
      numero: table.numero,
      codigoQr: table.codigoQr,
      url: this.buildMenuUrl(table.codigoQr),
    };
  }

  async getQrPng(id: string, current: AuthenticatedUser) {
    const table = await this.prisma.mesa.findFirst({
      where: { id, zona: { sucursalId: current.sucursalId } },
    });

    if (!table) {
      throw new NotFoundException('Mesa no encontrada');
    }

    const buffer = await QRCode.toBuffer(this.buildMenuUrl(table.codigoQr), {
      type: 'png',
      width: 512,
      margin: 2,
      errorCorrectionLevel: 'M',
    });

    return {
      buffer,
      filename: `mesa-${table.numero}.png`,
    };
  }

  private buildMenuUrl(codigoQr: string): string {
    const base =
      this.config.get<string>('MENU_BASE_URL') ?? 'http://localhost:4203';
    return `${base.replace(/\/$/, '')}/qr/${codigoQr}`;
  }

  private mapTable(
    table: {
      id: string;
      zonaId: string;
      numero: string;
      codigoQr: string;
      capacidad: number;
      estado: string;
      activo: boolean;
    },
    zone: { id: string; nombre: string },
  ) {
    return {
      id: table.id,
      zona: { id: zone.id, nombre: zone.nombre },
      numero: table.numero,
      codigoQr: table.codigoQr,
      capacidad: table.capacidad,
      estado: table.estado,
      activo: table.activo,
      url: this.buildMenuUrl(table.codigoQr),
    };
  }

  private auditPayload(value: unknown): Prisma.InputJsonValue {
    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
  }
}
