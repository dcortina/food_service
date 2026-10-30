import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { AuditService } from '../common/audit/audit.service';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreatePaymentDto,
  ListPaymentsQueryDto,
  VoidPaymentDto,
} from './dto/payment.dto';

const paymentInclude = {
  pedido: {
    select: {
      id: true,
      codigoPublico: true,
      total: true,
      estadoPago: true,
      estadoCumplimiento: true,
    },
  },
  turnoCaja: {
    select: {
      id: true,
      cajaId: true,
      cajeroId: true,
      estado: true,
    },
  },
  creadoPor: { select: { id: true, nombre: true, username: true } },
  conciliadoPor: { select: { id: true, nombre: true, username: true } },
  anuladoPor: { select: { id: true, nombre: true, username: true } },
} satisfies Prisma.PagoInclude;

type PaymentWithRelations = Prisma.PagoGetPayload<{
  include: typeof paymentInclude;
}>;

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async register(dto: CreatePaymentDto, current: AuthenticatedUser) {
    const order = await this.prisma.pedido.findFirst({
      where: {
        id: dto.pedidoId,
        negocioId: current.negocioId,
        sucursalId: current.sucursalId,
      },
    });

    if (!order) {
      throw new NotFoundException('Pedido no encontrado');
    }

    if (order.estadoCumplimiento === 'cancelado') {
      throw new ConflictException('El pedido está cancelado');
    }

    const shift = await this.prisma.turnoCaja.findFirst({
      where: {
        cajeroId: current.id,
        negocioId: current.negocioId,
        sucursalId: current.sucursalId,
        estado: 'abierto',
      },
    });

    if (!shift) {
      throw new ConflictException(
        'Abrí caja antes de registrar pagos',
      );
    }

    const idempotencyKey = dto.idempotencyKey ?? randomUUID();
    const existing = await this.prisma.pago.findUnique({
      where: {
        negocioId_idempotencyKey: {
          negocioId: current.negocioId,
          idempotencyKey,
        },
      },
      include: paymentInclude,
    });

    if (existing) {
      return this.mapPayment(existing);
    }

    const amount = new Prisma.Decimal(dto.monto);
    if (amount.lessThanOrEqualTo(0)) {
      throw new BadRequestException(
        'El monto del pago debe ser mayor que cero',
      );
    }

    const existingSum = await this.prisma.pago.aggregate({
      where: {
        pedidoId: order.id,
        estado: { not: 'anulado' },
      },
      _sum: { monto: true },
    });

    const alreadyPaid =
      existingSum._sum.monto ?? new Prisma.Decimal(0);

    if (alreadyPaid.plus(amount).greaterThan(order.total)) {
      throw new BadRequestException(
        'El pago supera el total del pedido',
      );
    }

    let montoRecibido: Prisma.Decimal | null = null;
    let cambio: Prisma.Decimal | null = null;
    let estado: 'registrado' | 'verificado' = 'registrado';

    if (dto.metodo === 'efectivo') {
      montoRecibido = dto.montoRecibido
        ? new Prisma.Decimal(dto.montoRecibido)
        : amount;

      if (montoRecibido.lessThan(amount)) {
        throw new BadRequestException(
          'El monto recibido es menor al monto del pago',
        );
      }

      cambio = montoRecibido.minus(amount);
      estado = 'verificado';
    }

    const created = await this.prisma.$transaction(async (tx) => {
      const payment = await tx.pago.create({
        data: {
          negocioId: current.negocioId,
          sucursalId: current.sucursalId,
          pedidoId: order.id,
          turnoCajaId: shift.id,
          metodo: dto.metodo,
          estado,
          monto: amount.toFixed(2),
          monedaId: order.monedaId,
          tasaCambioAplicada: order.tasaCambioAplicada.toFixed(6),
          montoRecibido: montoRecibido?.toFixed(2) ?? null,
          cambio: cambio?.toFixed(2) ?? null,
          referenciaExterna: dto.referenciaExterna ?? null,
          idempotencyKey,
          creadoPorId: current.id,
        },
        include: paymentInclude,
      });

      await this.recalculateOrderPayment(tx, order.id);
      await this.writeOutbox(tx, payment, 'pago.registrado');

      return payment;
    });

    const refreshed = await this.prisma.pago.findUniqueOrThrow({
      where: { id: created.id },
      include: paymentInclude,
    });

    await this.audit.log({
      negocioId: current.negocioId,
      sucursalId: current.sucursalId,
      usuarioId: current.id,
      accion: 'pago.registrar',
      entidad: 'pago',
      entidadId: refreshed.id,
      datosDespues: this.auditPayload(this.mapPayment(refreshed)),
    });

    return this.mapPayment(refreshed);
  }

  async verify(id: string, current: AuthenticatedUser) {
    const payment = await this.findPaymentEntity(id, current);

    if (payment.metodo === 'efectivo') {
      throw new ConflictException(
        'El pago en efectivo ya está verificado',
      );
    }

    if (payment.estado !== 'registrado') {
      throw new ConflictException(
        'El pago no está en estado registrado',
      );
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.pago.update({
        where: { id },
        data: { estado: 'verificado' },
        include: paymentInclude,
      });

      await this.recalculateOrderPayment(tx, result.pedidoId);
      await this.writeOutbox(tx, result, 'pago.verificado');
      return result;
    });

    const refreshed = await this.prisma.pago.findUniqueOrThrow({
      where: { id },
      include: paymentInclude,
    });

    await this.audit.log({
      negocioId: current.negocioId,
      sucursalId: current.sucursalId,
      usuarioId: current.id,
      accion: 'pago.verificar',
      entidad: 'pago',
      entidadId: id,
      datosAntes: this.auditPayload(this.mapPayment(payment)),
      datosDespues: this.auditPayload(this.mapPayment(refreshed)),
    });

    return this.mapPayment(refreshed);
  }

  async reconcile(id: string, current: AuthenticatedUser) {
    const payment = await this.findPaymentEntity(id, current);

    if (payment.metodo === 'efectivo') {
      throw new ConflictException(
        'El pago en efectivo no se concilia',
      );
    }

    if (payment.estado !== 'verificado') {
      throw new ConflictException(
        'El pago debe estar verificado para conciliarse',
      );
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.pago.update({
        where: { id },
        data: {
          estado: 'conciliado',
          conciliadoEn: new Date(),
          conciliadoPorId: current.id,
        },
        include: paymentInclude,
      });

      await this.writeOutbox(tx, result, 'pago.conciliado');
      return result;
    });

    const refreshed = await this.prisma.pago.findUniqueOrThrow({
      where: { id },
      include: paymentInclude,
    });

    await this.audit.log({
      negocioId: current.negocioId,
      sucursalId: current.sucursalId,
      usuarioId: current.id,
      accion: 'pago.conciliar',
      entidad: 'pago',
      entidadId: id,
      datosAntes: this.auditPayload(this.mapPayment(payment)),
      datosDespues: this.auditPayload(this.mapPayment(refreshed)),
    });

    return this.mapPayment(refreshed);
  }

  async void(
    id: string,
    dto: VoidPaymentDto,
    current: AuthenticatedUser,
  ) {
    const payment = await this.findPaymentEntity(id, current);

    if (payment.estado === 'anulado') {
      throw new ConflictException('El pago ya está anulado');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.pago.update({
        where: { id },
        data: {
          estado: 'anulado',
          anuladoMotivo: dto.motivo,
          anuladoPorId: current.id,
          anuladoEn: new Date(),
        },
        include: paymentInclude,
      });

      await this.recalculateOrderPayment(tx, result.pedidoId);
      await this.writeOutbox(tx, result, 'pago.anulado');
      return result;
    });

    const refreshed = await this.prisma.pago.findUniqueOrThrow({
      where: { id },
      include: paymentInclude,
    });

    await this.audit.log({
      negocioId: current.negocioId,
      sucursalId: current.sucursalId,
      usuarioId: current.id,
      accion: 'pago.anular',
      entidad: 'pago',
      entidadId: id,
      motivo: dto.motivo,
      datosAntes: this.auditPayload(this.mapPayment(payment)),
      datosDespues: this.auditPayload(this.mapPayment(refreshed)),
    });

    return this.mapPayment(refreshed);
  }

  async list(
    query: ListPaymentsQueryDto,
    current: AuthenticatedUser,
  ) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where: Prisma.PagoWhereInput = {
      negocioId: current.negocioId,
      sucursalId: current.sucursalId,
      ...(query.pedidoId ? { pedidoId: query.pedidoId } : {}),
      ...(query.turnoCajaId
        ? { turnoCajaId: query.turnoCajaId }
        : {}),
      ...(query.metodo ? { metodo: query.metodo } : {}),
      ...(query.estado ? { estado: query.estado } : {}),
    };

    const [total, payments] = await this.prisma.$transaction([
      this.prisma.pago.count({ where }),
      this.prisma.pago.findMany({
        where,
        include: paymentInclude,
        orderBy: { creadoEn: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return {
      data: payments.map((payment) => this.mapPayment(payment)),
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  private async recalculateOrderPayment(
    tx: Prisma.TransactionClient,
    orderId: string,
  ) {
    const order = await tx.pedido.findUnique({
      where: { id: orderId },
      select: { total: true, pagadoEn: true },
    });

    if (!order) return;

    const sum = await tx.pago.aggregate({
      where: {
        pedidoId: orderId,
        estado: { in: ['verificado', 'conciliado'] },
      },
      _sum: { monto: true },
    });

    const paid = sum._sum.monto ?? new Prisma.Decimal(0);
    const fullyPaid = paid.greaterThanOrEqualTo(order.total);
    const estadoPago = fullyPaid
      ? 'pagado'
      : paid.greaterThan(0)
        ? 'parcial'
        : 'pendiente';
    const pagadoEn = fullyPaid
      ? (order.pagadoEn ?? new Date())
      : null;

    await tx.pedido.update({
      where: { id: orderId },
      data: { estadoPago, pagadoEn },
    });
  }

  private async findPaymentEntity(
    id: string,
    current: AuthenticatedUser,
  ): Promise<PaymentWithRelations> {
    const payment = await this.prisma.pago.findFirst({
      where: {
        id,
        negocioId: current.negocioId,
        sucursalId: current.sucursalId,
      },
      include: paymentInclude,
    });

    if (!payment) {
      throw new NotFoundException('Pago no encontrado');
    }

    return payment;
  }

  private mapPayment(payment: PaymentWithRelations) {
    return {
      id: payment.id,
      negocioId: payment.negocioId,
      sucursalId: payment.sucursalId,
      pedido: {
        ...payment.pedido,
        total: payment.pedido.total.toFixed(2),
      },
      turnoCajaId: payment.turnoCajaId,
      turnoCaja: payment.turnoCaja,
      metodo: payment.metodo,
      estado: payment.estado,
      monto: payment.monto.toFixed(2),
      monedaId: payment.monedaId,
      tasaCambioAplicada: payment.tasaCambioAplicada.toFixed(6),
      montoRecibido: payment.montoRecibido?.toFixed(2) ?? null,
      cambio: payment.cambio?.toFixed(2) ?? null,
      referenciaExterna: payment.referenciaExterna,
      conciliadoEn: payment.conciliadoEn,
      conciliadoPor: payment.conciliadoPor,
      anuladoMotivo: payment.anuladoMotivo,
      anuladoPor: payment.anuladoPor,
      anuladoEn: payment.anuladoEn,
      creadoPor: payment.creadoPor,
      creadoEn: payment.creadoEn,
    };
  }

  private async writeOutbox(
    tx: Prisma.TransactionClient,
    payment: PaymentWithRelations,
    eventType: string,
  ) {
    await tx.outboxEvent.create({
      data: {
        negocioId: payment.negocioId,
        sucursalId: payment.sucursalId,
        aggregateType: 'pago',
        aggregateId: payment.id,
        eventType,
        payload: this.auditPayload({
          pagoId: payment.id,
          pedidoId: payment.pedidoId,
          metodo: payment.metodo,
          estado: payment.estado,
          monto: payment.monto.toFixed(2),
          turnoCajaId: payment.turnoCajaId,
        }),
        version: 1,
      },
    });
  }

  private auditPayload(value: unknown): Prisma.InputJsonValue {
    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
  }
}
