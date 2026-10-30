import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import argon2 from 'argon2';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { AuditService } from '../common/audit/audit.service';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { ListUsersQueryDto } from './dto/list-users-query.dto';
import { UpdateUserDto } from './dto/update-user.dto';

const userInclude = {
  rol: true,
  sucursales: { include: { sucursal: true } },
} satisfies Prisma.UsuarioInclude;

type UserWithRelations = Prisma.UsuarioGetPayload<{
  include: typeof userInclude;
}>;

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(query: ListUsersQueryDto, current: AuthenticatedUser) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where: Prisma.UsuarioWhereInput = {
      negocioId: current.negocioId,
      ...(query.activo !== undefined
        ? { activo: query.activo === 'true' }
        : {}),
      ...(query.search
        ? {
            OR: [
              {
                nombre: {
                  contains: query.search,
                  mode: 'insensitive',
                },
              },
              {
                username: {
                  contains: query.search,
                  mode: 'insensitive',
                },
              },
            ],
          }
        : {}),
    };

    const [total, users] = await this.prisma.$transaction([
      this.prisma.usuario.count({ where }),
      this.prisma.usuario.findMany({
        where,
        include: userInclude,
        orderBy: { creadoEn: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return {
      data: users.map((user) => this.sanitize(user)),
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async findOne(id: string, current: AuthenticatedUser) {
    const user = await this.prisma.usuario.findFirst({
      where: { id, negocioId: current.negocioId },
      include: userInclude,
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    return this.sanitize(user);
  }

  async create(dto: CreateUserDto, current: AuthenticatedUser) {
    await this.assertUsernameAvailable(dto.username, current.negocioId);
    await this.assertSucursal(dto.sucursalId, current.negocioId);
    await this.assertRol(dto.rolId);

    const passwordHash = await argon2.hash(dto.password, {
      type: argon2.argon2id,
    });
    const pinHash = dto.pin
      ? await argon2.hash(dto.pin, { type: argon2.argon2id })
      : null;

    const user = await this.prisma.$transaction(async (tx) => {
      const created = await tx.usuario.create({
        data: {
          negocioId: current.negocioId,
          rolId: dto.rolId,
          nombre: dto.nombre,
          username: dto.username,
          passwordHash,
          pinHash,
          telefono: dto.telefono ?? null,
        },
        include: userInclude,
      });

      await tx.usuarioSucursal.create({
        data: {
          usuarioId: created.id,
          sucursalId: dto.sucursalId,
          esPrincipal: true,
        },
      });

      return tx.usuario.findUniqueOrThrow({
        where: { id: created.id },
        include: userInclude,
      });
    });

    await this.audit.log({
      negocioId: current.negocioId,
      sucursalId: current.sucursalId,
      usuarioId: current.id,
      accion: 'usuario.crear',
      entidad: 'usuario',
      entidadId: user.id,
      datosDespues: this.auditPayload(this.sanitize(user)),
    });

    return this.sanitize(user);
  }

  async update(
    id: string,
    dto: UpdateUserDto,
    current: AuthenticatedUser,
  ) {
    const existing = await this.prisma.usuario.findFirst({
      where: { id, negocioId: current.negocioId },
      include: userInclude,
    });

    if (!existing) {
      throw new NotFoundException('Usuario no encontrado');
    }

    if (dto.username && dto.username !== existing.username) {
      await this.assertUsernameAvailable(
        dto.username,
        current.negocioId,
        id,
      );
    }
    if (dto.sucursalId) {
      await this.assertSucursal(dto.sucursalId, current.negocioId);
    }
    if (dto.rolId) {
      await this.assertRol(dto.rolId);
    }

    const data: Prisma.UsuarioUpdateInput = {
      ...(dto.nombre !== undefined ? { nombre: dto.nombre } : {}),
      ...(dto.username !== undefined ? { username: dto.username } : {}),
      ...(dto.telefono !== undefined ? { telefono: dto.telefono } : {}),
      ...(dto.activo !== undefined ? { activo: dto.activo } : {}),
      ...(dto.rolId !== undefined
        ? { rol: { connect: { id: dto.rolId } } }
        : {}),
      ...(dto.password
        ? {
            passwordHash: await argon2.hash(dto.password, {
              type: argon2.argon2id,
            }),
          }
        : {}),
      ...(dto.pin
        ? {
            pinHash: await argon2.hash(dto.pin, {
              type: argon2.argon2id,
            }),
          }
        : {}),
    };

    const updated = await this.prisma.$transaction(async (tx) => {
      const user = await tx.usuario.update({
        where: { id },
        data,
        include: userInclude,
      });

      if (dto.sucursalId) {
        await tx.usuarioSucursal.updateMany({
          where: { usuarioId: id },
          data: { esPrincipal: false },
        });
        await tx.usuarioSucursal.upsert({
          where: {
            usuarioId_sucursalId: {
              usuarioId: id,
              sucursalId: dto.sucursalId,
            },
          },
          update: { esPrincipal: true },
          create: {
            usuarioId: id,
            sucursalId: dto.sucursalId,
            esPrincipal: true,
          },
        });
      }

      return user;
    });

    await this.audit.log({
      negocioId: current.negocioId,
      sucursalId: current.sucursalId,
      usuarioId: current.id,
      accion: 'usuario.actualizar',
      entidad: 'usuario',
      entidadId: id,
      datosAntes: this.auditPayload(this.sanitize(existing)),
      datosDespues: this.auditPayload(this.sanitize(updated)),
    });

    return this.sanitize(updated);
  }

  private async assertUsernameAvailable(
    username: string,
    negocioId: string,
    excludeId?: string,
  ) {
    const existing = await this.prisma.usuario.findFirst({
      where: {
        negocioId,
        username,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
    });

    if (existing) {
      throw new ConflictException('El nombre de usuario ya existe');
    }
  }

  private async assertSucursal(sucursalId: string, negocioId: string) {
    const sucursal = await this.prisma.sucursal.findFirst({
      where: { id: sucursalId, negocioId },
    });

    if (!sucursal) {
      throw new NotFoundException('Sucursal no encontrada');
    }
  }

  private async assertRol(rolId: string) {
    const rol = await this.prisma.rol.findUnique({ where: { id: rolId } });

    if (!rol) {
      throw new NotFoundException('Rol no encontrado');
    }
  }

  private sanitize(user: UserWithRelations) {
    const principal =
      user.sucursales.find((item) => item.esPrincipal) ??
      user.sucursales[0];

    return {
      id: user.id,
      negocioId: user.negocioId,
      nombre: user.nombre,
      username: user.username,
      telefono: user.telefono,
      activo: user.activo,
      rol: { id: user.rol.id, nombre: user.rol.nombre },
      sucursal: principal
        ? {
            id: principal.sucursal.id,
            nombre: principal.sucursal.nombre,
          }
        : null,
      ultimoAcceso: user.ultimoAcceso,
      creadoEn: user.creadoEn,
    };
  }

  private auditPayload(value: unknown): Prisma.InputJsonValue {
    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
  }
}
