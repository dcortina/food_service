import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { AuditService } from '../common/audit/audit.service';
import { Prisma } from '../generated/prisma/client';
import { BusinessDayService } from '../orders/business-day.service';
import { PrismaService } from '../prisma/prisma.service';
import { CloseShiftDto } from './dto/close-shift.dto';
import { ListShiftsQueryDto } from './dto/list-shifts-query.dto';
import { CreateMovementDto } from './dto/movement.dto';
import { OpenShiftDto } from './dto/open-shift.dto';

const shiftInclude = {
  caja: true,
  cajero: { select: { id: true, nombre: true, username: true } },
  autorizadoPor: { select: { id: true, nombre: true, username: true } },
  denominaciones: { orderBy: { tipo: 'asc' } },
  movimientos: { orderBy: { creadoEn: 'asc' } },
  pagos: {
    include: {
      pedido: {
        select: { id: true, codigoPublico: true, total: true },
      },
    },
    orderBy: { creadoEn: 'asc' },
  },
} satisfies Prisma.TurnoCajaInclude;

type ShiftWithRelations = Prisma.TurnoCajaGetPayload<{
  include: typeof shiftInclude;
}>;

@Injectable()
export class CashService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly businessDay: BusinessDayService,
    private readonly audit: AuditService,
  ) {}

  async openShift(dto: OpenShiftDto, current: AuthenticatedUser) {
    const sucursal = await this.prisma.sucursal.findFirst({
      where: {
        id: current.sucursalId,
        negocioId: current.negocioId,
        activo: true,
      },
    });

    if (!sucursal) {
      throw new NotFoundException('Sucursal no encontrada');
    }

    const negocio = await this.prisma.negocio.findFirst({
      where: { id: current.negocioId, activo: true },
    });

    if (!negocio) {
      throw new NotFoundException('Negocio no encontrado');
    }

    const caja = dto.cajaId
      ? await this.prisma.caja.findFirst({
          where: {
            id: dto.cajaId,
            sucursalId: current.sucursalId,
            activo: true,
          },
        })
      : await this.prisma.caja.findFirst({
          where: {
            sucursalId: current.sucursalId,
            activo: true,
          },
          orderBy: { nombre: 'asc' },
        });

    if (!caja) {
      throw new NotFoundException('Caja no encontrada');
    }

    const openShift = await this.prisma.turnoCaja.findFirst({
      where: { cajaId: caja.id, estado: 'abierto' },
    });

    if (openShift) {
      throw new ConflictException('La caja ya tiene un turno abierto');
    }

    const cashierOpenShift = await this.prisma.turnoCaja.findFirst({
      where: { cajeroId: current.id, estado: 'abierto' },
    });

    if (cashierOpenShift) {
      throw new ConflictException('Ya tenés un turno abierto');
    }

    const fondoInicial = new Prisma.Decimal(dto.fondoInicial);
    if (fondoInicial.lessThanOrEqualTo(0)) {
      throw new BadRequestException(
        'El fondo inicial debe ser mayor que cero',
      );
    }

    const denominations = dto.denominaciones ?? [];
    if (denominations.length) {
      const total = denominations.reduce(
        (sum, item) =>
          sum.plus(
            new Prisma.Decimal(item.denominacion).times(item.cantidad),
          ),
        new Prisma.Decimal(0),
      );

      if (!total.equals(fondoInicial)) {
        throw new BadRequestException(
          'La suma de denominaciones no coincide con el fondo inicial',
        );
      }
    }

    const businessDay = this.businessDay.getBusinessDay(negocio);

    const created = await this.prisma.$transaction(async (tx) => {
      const shift = await tx.turnoCaja.create({
        data: {
          negocioId: current.negocioId,
          sucursalId: current.sucursalId,
          cajaId: caja.id,
          cajeroId: current.id,
          fechaOperativa: businessDay.date,
          fondoInicial: fondoInicial.toFixed(2),
          estado: 'abierto',
          denominaciones: denominations.length
            ? {
                create: denominations.map((item) => ({
                  tipo: 'inicial',
                  denominacion: item.denominacion,
                  cantidad: item.cantidad,
                  subtotal: new Prisma.Decimal(item.denominacion)
                    .times(item.cantidad)
                    .toFixed(2),
                })),
              }
            : undefined,
        },
        include: shiftInclude,
      });

      await this.writeOutbox(tx, shift, 'caja.abierta');
      return shift;
    });

    await this.audit.log({
      negocioId: current.negocioId,
      sucursalId: current.sucursalId,
      usuarioId: current.id,
      accion: 'caja.abrir',
      entidad: 'turno_caja',
      entidadId: created.id,
      datosDespues: this.auditPayload(this.mapShift(created, current, false)),
    });

    const blind = await this.isBlindCountEnabled(
      current.negocioId,
      current.sucursalId,
    );

    return this.mapShift(created, current, blind);
  }

  async getCurrentShift(current: AuthenticatedUser) {
    const shift = await this.prisma.turnoCaja.findFirst({
      where: {
        cajeroId: current.id,
        negocioId: current.negocioId,
        sucursalId: current.sucursalId,
        estado: 'abierto',
      },
      include: shiftInclude,
    });

    if (!shift) {
      throw new NotFoundException('No tenés un turno abierto');
    }

    const blind = await this.isBlindCountEnabled(
      current.negocioId,
      current.sucursalId,
    );

    return this.mapShift(shift, current, blind);
  }

  async listShifts(
    query: ListShiftsQueryDto,
    current: AuthenticatedUser,
  ) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where: Prisma.TurnoCajaWhereInput = {
      negocioId: current.negocioId,
      sucursalId: current.sucursalId,
      ...(query.estado ? { estado: query.estado } : {}),
      ...(query.cajeroId ? { cajeroId: query.cajeroId } : {}),
      ...(query.fecha
        ? { fechaOperativa: new Date(`${query.fecha}T00:00:00.000Z`) }
        : {}),
    };

    const [total, shifts] = await this.prisma.$transaction([
      this.prisma.turnoCaja.count({ where }),
      this.prisma.turnoCaja.findMany({
        where,
        include: shiftInclude,
        orderBy: { abiertoEn: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    const blind = await this.isBlindCountEnabled(
      current.negocioId,
      current.sucursalId,
    );

    return {
      data: shifts.map((shift) => this.mapShift(shift, current, blind)),
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async findShift(id: string, current: AuthenticatedUser) {
    const shift = await this.findShiftEntity(id, current);
    const blind = await this.isBlindCountEnabled(
      current.negocioId,
      current.sucursalId,
    );

    return this.mapShift(shift, current, blind);
  }

  async createMovement(
    id: string,
    dto: CreateMovementDto,
    current: AuthenticatedUser,
  ) {
    const shift = await this.findShiftEntity(id, current);

    if (shift.estado !== 'abierto') {
      throw new ConflictException('El turno está cerrado');
    }

    if (
      dto.tipo === 'retiro' &&
      !current.permisos.includes('caja.retiro')
    ) {
      throw new ForbiddenException(
        'No tenés permiso para retirar efectivo',
      );
    }

    const amount = new Prisma.Decimal(dto.monto);

    if (dto.tipo === 'ajuste') {
      if (amount.equals(0)) {
        throw new BadRequestException('El ajuste no puede ser cero');
      }
    } else if (amount.lessThanOrEqualTo(0)) {
      throw new BadRequestException(
        'El monto debe ser mayor que cero',
      );
    }

    const requiresAuthorization =
      dto.tipo === 'retiro' ||
      dto.tipo === 'gasto_menor' ||
      dto.tipo === 'devolucion_efectivo';

    if (requiresAuthorization && !dto.autorizadoPorId) {
      throw new BadRequestException(
        'Este movimiento requiere un autorizador',
      );
    }

    if (dto.autorizadoPorId) {
      const authorizer = await this.prisma.usuario.findFirst({
        where: {
          id: dto.autorizadoPorId,
          negocioId: current.negocioId,
          activo: true,
        },
        include: {
          rol: {
            include: {
              permisos: { include: { permiso: true } },
            },
          },
        },
      });

      if (!authorizer) {
        throw new NotFoundException('Autorizador no encontrado');
      }

      const authorizerPermissions = authorizer.rol.permisos.map(
        (item) => item.permiso.codigo,
      );

      if (
        dto.tipo === 'retiro' &&
        !authorizerPermissions.includes('caja.retiro')
      ) {
        throw new ForbiddenException(
          'El autorizador no puede autorizar retiros',
        );
      }

      if (
        (dto.tipo === 'gasto_menor' ||
          dto.tipo === 'devolucion_efectivo') &&
        !authorizerPermissions.includes('caja.movimiento')
      ) {
        throw new ForbiddenException(
          'El autorizador no puede autorizar este movimiento',
        );
      }
    }

    const signedAmount =
      dto.tipo === 'retiro' ||
      dto.tipo === 'gasto_menor' ||
      dto.tipo === 'devolucion_efectivo'
        ? amount.negated()
        : amount;

    const movement = await this.prisma.$transaction(async (tx) => {
      const created = await tx.movimientoCaja.create({
        data: {
          turnoCajaId: id,
          tipo: dto.tipo,
          monto: signedAmount.toFixed(2),
          motivo: dto.motivo,
          autorizadoPorId: dto.autorizadoPorId ?? null,
          creadoPorId: current.id,
        },
      });

      await this.writeOutbox(tx, shift, 'caja.movimiento', {
        movimientoId: created.id,
        tipo: created.tipo,
        monto: created.monto.toFixed(2),
      });

      return created;
    });

    await this.audit.log({
      negocioId: current.negocioId,
      sucursalId: current.sucursalId,
      usuarioId: current.id,
      accion: 'caja.movimiento',
      entidad: 'movimiento_caja',
      entidadId: movement.id,
      motivo: dto.motivo,
      datosDespues: this.auditPayload({
        tipo: movement.tipo,
        monto: movement.monto.toFixed(2),
        autorizadoPorId: movement.autorizadoPorId,
      }),
    });

    return {
      id: movement.id,
      turnoCajaId: movement.turnoCajaId,
      tipo: movement.tipo,
      monto: movement.monto.toFixed(2),
      motivo: movement.motivo,
      autorizadoPorId: movement.autorizadoPorId,
      creadoPorId: movement.creadoPorId,
      creadoEn: movement.creadoEn,
    };
  }

  async closeShift(
    id: string,
    dto: CloseShiftDto,
    current: AuthenticatedUser,
  ) {
    const shift = await this.findShiftEntity(id, current);

    if (shift.estado !== 'abierto') {
      throw new ConflictException('El turno ya está cerrado');
    }

    const counted = new Prisma.Decimal(dto.efectivoContado);
    if (counted.lessThan(0)) {
      throw new BadRequestException(
        'El efectivo contado no puede ser negativo',
      );
    }

    const denominations = dto.denominaciones ?? [];
    if (denominations.length) {
      const total = denominations.reduce(
        (sum, item) =>
          sum.plus(
            new Prisma.Decimal(item.denominacion).times(item.cantidad),
          ),
        new Prisma.Decimal(0),
      );

      if (!total.equals(counted)) {
        throw new BadRequestException(
          'La suma de denominaciones no coincide con el efectivo contado',
        );
      }
    }

    if (dto.autorizadoPorId) {
      const authorizer = await this.prisma.usuario.findFirst({
        where: {
          id: dto.autorizadoPorId,
          negocioId: current.negocioId,
          activo: true,
        },
      });

      if (!authorizer) {
        throw new NotFoundException('Autorizador no encontrado');
      }
    }

    const closed = await this.prisma.$transaction(async (tx) => {
      const cash = await tx.pago.aggregate({
        where: {
          turnoCajaId: id,
          metodo: 'efectivo',
          estado: { in: ['verificado', 'conciliado'] },
        },
        _sum: { monto: true },
      });

      const movements = await tx.movimientoCaja.aggregate({
        where: { turnoCajaId: id },
        _sum: { monto: true },
      });

      const electronicReported = await tx.pago.aggregate({
        where: {
          turnoCajaId: id,
          metodo: { in: ['transfermovil', 'enzona'] },
          estado: {
            in: ['registrado', 'verificado', 'conciliado'],
          },
        },
        _sum: { monto: true },
      });

      const electronicConciliated = await tx.pago.aggregate({
        where: {
          turnoCajaId: id,
          metodo: { in: ['transfermovil', 'enzona'] },
          estado: 'conciliado',
        },
        _sum: { monto: true },
      });

      const expected = new Prisma.Decimal(shift.fondoInicial)
        .plus(cash._sum.monto ?? new Prisma.Decimal(0))
        .plus(movements._sum.monto ?? new Prisma.Decimal(0));

      const difference = counted.minus(expected);
      const reported =
        electronicReported._sum.monto ?? new Prisma.Decimal(0);
      const conciliated =
        electronicConciliated._sum.monto ?? new Prisma.Decimal(0);

      const result = await tx.turnoCaja.update({
        where: { id },
        data: {
          estado: 'cerrado',
          cerradoEn: new Date(),
          efectivoEsperado: expected.toFixed(2),
          efectivoContado: counted.toFixed(2),
          descuadre: difference.toFixed(2),
          totalElectronicoReportado: reported.toFixed(2),
          totalElectronicoConciliado: conciliated.toFixed(2),
          observaciones: dto.observaciones ?? null,
          autorizadoPorId: dto.autorizadoPorId ?? null,
        },
        include: shiftInclude,
      });

      if (denominations.length) {
        await tx.turnoCajaDenominacion.createMany({
          data: denominations.map((item) => ({
            turnoCajaId: id,
            tipo: 'final',
            denominacion: item.denominacion,
            cantidad: item.cantidad,
            subtotal: new Prisma.Decimal(item.denominacion)
              .times(item.cantidad)
              .toFixed(2),
          })),
        });
      }

      await this.writeOutbox(tx, result, 'caja.cerrada', {
        efectivoEsperado: expected.toFixed(2),
        efectivoContado: counted.toFixed(2),
        descuadre: difference.toFixed(2),
      });

      return tx.turnoCaja.findUniqueOrThrow({
        where: { id },
        include: shiftInclude,
      });
    });

    await this.audit.log({
      negocioId: current.negocioId,
      sucursalId: current.sucursalId,
      usuarioId: current.id,
      accion: 'caja.cerrar',
      entidad: 'turno_caja',
      entidadId: id,
      datosAntes: this.auditPayload(this.mapShift(shift, current, false)),
      datosDespues: this.auditPayload(
        this.mapShift(closed, current, false),
      ),
    });

    return this.mapShift(closed, current, false);
  }

  private async findShiftEntity(
    id: string,
    current: AuthenticatedUser,
  ): Promise<ShiftWithRelations> {
    const shift = await this.prisma.turnoCaja.findFirst({
      where: {
        id,
        negocioId: current.negocioId,
        sucursalId: current.sucursalId,
      },
      include: shiftInclude,
    });

    if (!shift) {
      throw new NotFoundException('Turno no encontrado');
    }

    return shift;
  }

  private async isBlindCountEnabled(
    negocioId: string,
    sucursalId: string,
  ): Promise<boolean> {
    const config = await this.prisma.configuracion.findFirst({
      where: {
        negocioId,
        sucursalId,
        clave: 'arqueo_ciego',
      },
    });

    return config?.valor === true;
  }

  private mapShift(
    shift: ShiftWithRelations,
    current: AuthenticatedUser,
    blind: boolean,
  ) {
    const cashPayments = shift.pagos.filter(
      (pago) =>
        pago.metodo === 'efectivo' &&
        (pago.estado === 'verificado' || pago.estado === 'conciliado'),
    );
    const cashSum = cashPayments.reduce(
      (sum, pago) => sum.plus(pago.monto),
      new Prisma.Decimal(0),
    );
    const movementSum = shift.movimientos.reduce(
      (sum, movement) => sum.plus(movement.monto),
      new Prisma.Decimal(0),
    );
    const expected = new Prisma.Decimal(shift.fondoInicial)
      .plus(cashSum)
      .plus(movementSum);

    const electronicReported = shift.pagos.filter(
      (pago) =>
        (pago.metodo === 'transfermovil' || pago.metodo === 'enzona') &&
        (pago.estado === 'registrado' ||
          pago.estado === 'verificado' ||
          pago.estado === 'conciliado'),
    );
    const reportedSum = electronicReported.reduce(
      (sum, pago) => sum.plus(pago.monto),
      new Prisma.Decimal(0),
    );
    const electronicConciliated = shift.pagos.filter(
      (pago) =>
        (pago.metodo === 'transfermovil' || pago.metodo === 'enzona') &&
        pago.estado === 'conciliado',
    );
    const conciliatedSum = electronicConciliated.reduce(
      (sum, pago) => sum.plus(pago.monto),
      new Prisma.Decimal(0),
    );

    const revealExpected =
      shift.estado === 'cerrado' ||
      !blind ||
      current.permisos.includes('auditoria.ver');

    return {
      id: shift.id,
      negocioId: shift.negocioId,
      sucursalId: shift.sucursalId,
      caja: { id: shift.caja.id, nombre: shift.caja.nombre },
      cajero: shift.cajero,
      fechaOperativa: shift.fechaOperativa.toISOString().slice(0, 10),
      fondoInicial: shift.fondoInicial.toFixed(2),
      estado: shift.estado,
      abiertoEn: shift.abiertoEn,
      cerradoEn: shift.cerradoEn,
      efectivoEsperado: revealExpected
        ? (shift.efectivoEsperado ?? expected).toFixed(2)
        : null,
      efectivoContado: shift.efectivoContado?.toFixed(2) ?? null,
      descuadre: shift.descuadre?.toFixed(2) ?? null,
      totalElectronicoReportado: (
        shift.totalElectronicoReportado ?? reportedSum
      ).toFixed(2),
      totalElectronicoConciliado: (
        shift.totalElectronicoConciliado ?? conciliatedSum
      ).toFixed(2),
      observaciones: shift.observaciones,
      autorizadoPor: shift.autorizadoPor,
      denominaciones: shift.denominaciones.map((item) => ({
        id: item.id,
        tipo: item.tipo,
        denominacion: item.denominacion.toFixed(2),
        cantidad: item.cantidad,
        subtotal: item.subtotal.toFixed(2),
      })),
      movimientos: shift.movimientos.map((movement) => ({
        id: movement.id,
        tipo: movement.tipo,
        monto: movement.monto.toFixed(2),
        motivo: movement.motivo,
        autorizadoPorId: movement.autorizadoPorId,
        creadoPorId: movement.creadoPorId,
        creadoEn: movement.creadoEn,
      })),
      pagos: shift.pagos.map((pago) => ({
        id: pago.id,
        pedido: pago.pedido,
        metodo: pago.metodo,
        estado: pago.estado,
        monto: pago.monto.toFixed(2),
        montoRecibido: pago.montoRecibido?.toFixed(2) ?? null,
        cambio: pago.cambio?.toFixed(2) ?? null,
        referenciaExterna: pago.referenciaExterna,
        creadoEn: pago.creadoEn,
      })),
    };
  }

  private async writeOutbox(
    tx: Prisma.TransactionClient,
    shift: ShiftWithRelations,
    eventType: string,
    extra: Record<string, unknown> = {},
  ) {
    await tx.outboxEvent.create({
      data: {
        negocioId: shift.negocioId,
        sucursalId: shift.sucursalId,
        aggregateType: 'turno_caja',
        aggregateId: shift.id,
        eventType,
        payload: this.auditPayload({
          turnoCajaId: shift.id,
          cajaId: shift.cajaId,
          cajeroId: shift.cajeroId,
          estado: shift.estado,
          ...extra,
        }),
        version: 1,
      },
    });
  }

  private auditPayload(value: unknown): Prisma.InputJsonValue {
    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
  }
}
