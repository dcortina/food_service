import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import argon2 from 'argon2';
import { createHash, randomBytes } from 'node:crypto';
import { AuditService } from '../common/audit/audit.service';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { LogoutDto } from './dto/logout.dto';
import { PinVerifyDto } from './dto/pin-verify.dto';
import { RefreshDto } from './dto/refresh.dto';
import { AuthenticatedUser } from './interfaces/authenticated-user.interface';
import { RequestMeta } from './request-meta';

const userInclude = {
  rol: { include: { permisos: { include: { permiso: true } } } },
  sucursales: { include: { sucursal: true } },
  negocio: true,
} satisfies Prisma.UsuarioInclude;

type UserWithAccess = Prisma.UsuarioGetPayload<{
  include: typeof userInclude;
}>;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly audit: AuditService,
  ) {}

  async login(dto: LoginDto, meta: RequestMeta) {
    const usuario = await this.prisma.usuario.findFirst({
      where: { username: dto.username, activo: true },
      include: userInclude,
    });

    if (!usuario) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const passwordOk = await argon2.verify(usuario.passwordHash, dto.password);
    if (!passwordOk) {
      await this.audit.log({
        negocioId: usuario.negocioId,
        usuarioId: usuario.id,
        accion: 'auth.login.failed',
        entidad: 'usuario',
        entidadId: usuario.id,
        motivo: 'Contraseña incorrecta',
        ...meta,
      });
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const sucursalId = this.resolveSucursalId(usuario);
    const permisos = this.resolvePermissions(usuario);
    const session = await this.createSession(usuario.id, meta);
    const accessToken = await this.signAccessToken(
      usuario,
      sucursalId,
      permisos,
    );

    await this.prisma.usuario.update({
      where: { id: usuario.id },
      data: { ultimoAcceso: new Date() },
    });

    await this.audit.log({
      negocioId: usuario.negocioId,
      sucursalId,
      usuarioId: usuario.id,
      accion: 'auth.login',
      entidad: 'usuario',
      entidadId: usuario.id,
      ...meta,
    });

    return {
      accessToken,
      refreshToken: session.refreshToken,
      expiresIn: this.durationToSeconds(
        this.config.get<string>('JWT_ACCESS_TTL') ?? '15m',
      ),
      user: this.sanitizeUser(usuario, sucursalId, permisos),
    };
  }

  async refresh(dto: RefreshDto, meta: RequestMeta) {
    const refreshHash = this.hashToken(dto.refreshToken);
    const session = await this.prisma.sesion.findFirst({
      where: {
        refreshHash,
        estado: 'activa',
        expiraEn: { gt: new Date() },
      },
      include: {
        usuario: { include: userInclude },
      },
    });

    if (!session || !session.usuario.activo) {
      throw new UnauthorizedException('Refresh token inválido o expirado');
    }

    const usuario = session.usuario;
    const sucursalId = this.resolveSucursalId(usuario);
    const permisos = this.resolvePermissions(usuario);

    await this.prisma.sesion.update({
      where: { id: session.id },
      data: { estado: 'revocada', revocadaEn: new Date() },
    });

    const newSession = await this.createSession(usuario.id, meta);
    const accessToken = await this.signAccessToken(
      usuario,
      sucursalId,
      permisos,
    );

    await this.audit.log({
      negocioId: usuario.negocioId,
      sucursalId,
      usuarioId: usuario.id,
      accion: 'auth.refresh',
      entidad: 'sesion',
      entidadId: session.id,
      ...meta,
    });

    return {
      accessToken,
      refreshToken: newSession.refreshToken,
      expiresIn: this.durationToSeconds(
        this.config.get<string>('JWT_ACCESS_TTL') ?? '15m',
      ),
      user: this.sanitizeUser(usuario, sucursalId, permisos),
    };
  }

  async logout(dto: LogoutDto, meta: RequestMeta): Promise<{ success: true }> {
    const refreshHash = this.hashToken(dto.refreshToken);
    const session = await this.prisma.sesion.findFirst({
      where: { refreshHash, estado: 'activa' },
      include: { usuario: true },
    });

    if (session) {
      await this.prisma.sesion.update({
        where: { id: session.id },
        data: { estado: 'revocada', revocadaEn: new Date() },
      });

      await this.audit.log({
        negocioId: session.usuario.negocioId,
        usuarioId: session.usuarioId,
        accion: 'auth.logout',
        entidad: 'sesion',
        entidadId: session.id,
        ...meta,
      });
    }

    return { success: true };
  }

  async me(user: AuthenticatedUser) {
    const usuario = await this.prisma.usuario.findFirst({
      where: {
        id: user.id,
        negocioId: user.negocioId,
        activo: true,
      },
      include: userInclude,
    });

    if (!usuario) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    const sucursalId = this.resolveSucursalId(usuario);
    const permisos = this.resolvePermissions(usuario);
    return this.sanitizeUser(usuario, sucursalId, permisos);
  }

  async verifyPin(
    dto: PinVerifyDto,
    user: AuthenticatedUser,
    meta: RequestMeta,
  ) {
    const usuario = await this.prisma.usuario.findFirst({
      where: {
        id: user.id,
        negocioId: user.negocioId,
        activo: true,
      },
      include: userInclude,
    });

    if (!usuario || !usuario.pinHash) {
      throw new UnauthorizedException('PIN no configurado');
    }

    const pinOk = await argon2.verify(usuario.pinHash, dto.pin);
    if (!pinOk) {
      await this.audit.log({
        negocioId: usuario.negocioId,
        sucursalId: user.sucursalId,
        usuarioId: usuario.id,
        accion: 'auth.pin.failed',
        entidad: 'usuario',
        entidadId: usuario.id,
        motivo: `PIN incorrecto para ${dto.accion}`,
        ...meta,
      });
      throw new UnauthorizedException('PIN inválido');
    }

    const permisos = this.resolvePermissions(usuario);
    if (!permisos.includes(dto.accion)) {
      throw new ForbiddenException('El usuario no tiene el permiso solicitado');
    }

    const authorizationToken = await this.jwt.signAsync(
      {
        sub: usuario.id,
        negocioId: usuario.negocioId,
        sucursalId: user.sucursalId,
        rol: usuario.rol.nombre,
        permisos,
        typ: 'pin',
        accion: dto.accion,
        entidadId: dto.entidadId,
      },
      { expiresIn: '5m' },
    );

    await this.audit.log({
      negocioId: usuario.negocioId,
      sucursalId: user.sucursalId,
      usuarioId: usuario.id,
      accion: 'auth.pin.verify',
      entidad: 'usuario',
      entidadId: usuario.id,
      motivo: dto.accion,
      ...meta,
    });

    return { authorizationToken, expiresIn: 300 };
  }

  private resolveSucursalId(usuario: UserWithAccess): string {
    const principal =
      usuario.sucursales.find((item) => item.esPrincipal) ??
      usuario.sucursales[0];

    if (!principal) {
      throw new UnauthorizedException(
        'El usuario no tiene una sucursal asignada',
      );
    }

    return principal.sucursalId;
  }

  private resolvePermissions(usuario: UserWithAccess): string[] {
    return usuario.rol.permisos.map((item) => item.permiso.codigo);
  }

  private async createSession(
    usuarioId: string,
    meta: RequestMeta,
  ): Promise<{ refreshToken: string }> {
    const refreshToken = randomBytes(48).toString('base64url');
    const refreshHash = this.hashToken(refreshToken);
    const ttl = this.config.get<string>('JWT_REFRESH_TTL') ?? '30d';
    const expiraEn = new Date(Date.now() + this.durationToMs(ttl));

    await this.prisma.sesion.create({
      data: {
        usuarioId,
        refreshHash,
        ip: meta.ip ?? null,
        userAgent: meta.userAgent ?? null,
        expiraEn,
      },
    });

    return { refreshToken };
  }

  private async signAccessToken(
    usuario: UserWithAccess,
    sucursalId: string,
    permisos: string[],
  ): Promise<string> {
    return this.jwt.signAsync({
      sub: usuario.id,
      negocioId: usuario.negocioId,
      sucursalId,
      rol: usuario.rol.nombre,
      permisos,
      typ: 'access',
    });
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private durationToMs(value: string): number {
    const match = /^(\d+)([smhd])$/.exec(value);
    if (!match) {
      throw new Error(`Duración inválida: ${value}`);
    }

    const amount = Number(match[1]);
    const unit = match[2] as 's' | 'm' | 'h' | 'd';
    const multipliers = {
      s: 1_000,
      m: 60_000,
      h: 3_600_000,
      d: 86_400_000,
    } as const;

    return amount * multipliers[unit];
  }

  private durationToSeconds(value: string): number {
    return Math.floor(this.durationToMs(value) / 1_000);
  }

  private sanitizeUser(
    usuario: UserWithAccess,
    sucursalId: string,
    permisos: string[],
  ) {
    const sucursal = usuario.sucursales.find(
      (item) => item.sucursalId === sucursalId,
    )?.sucursal;

    return {
      id: usuario.id,
      negocioId: usuario.negocioId,
      sucursalId,
      nombre: usuario.nombre,
      username: usuario.username,
      telefono: usuario.telefono,
      rol: usuario.rol.nombre,
      permisos,
      negocio: {
        id: usuario.negocio.id,
        nombre: usuario.negocio.nombre,
      },
      sucursal: sucursal
        ? { id: sucursal.id, nombre: sucursal.nombre }
        : null,
    };
  }
}
