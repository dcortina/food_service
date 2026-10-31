import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { AuditService } from '../common/audit/audit.service';
import { Prisma } from '../generated/prisma/client';
import { OrdersService } from '../orders/orders.service';
import { PrismaService } from '../prisma/prisma.service';
import { AssignDeliveryDto } from './dto/assign-delivery.dto';
import { CreateLiquidationDto } from './dto/create-liquidation.dto';
import { DeliverOrderDto } from './dto/deliver-order.dto';

const assignmentInclude = {
  pedido: {
    include: {
      cliente: true,
      moneda: true,
      items: {
        orderBy: { orden: 'asc' },
        include: { modificadores: true },
      },
    },
  },
} satisfies Prisma.AsignacionRepartidorInclude;

const pendingInclude = {
  ...assignmentInclude,
  repartidor: {
    include: {
      usuario: { select: { id: true, nombre: true, username: true } },
    },
  },
} satisfies Prisma.AsignacionRepartidorInclude;

type AssignmentWithOrder = Prisma.AsignacionRepartidorGetPayload<{
  include: typeof assignmentInclude;
}>;

type PendingAssignment = Prisma.AsignacionRepartidorGetPayload<{
  include: typeof pendingInclude;
}>;

@Injectable()
export class DeliveryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ordersService: OrdersService,
    private readonly audit: AuditService,
  ) {}

  async listOrders(current: AuthenticatedUser) {
    const courier = await this.getCourier(current);

    const assignments = await this.prisma.asignacionRepartidor.findMany({
      where: {
        repartidorId: courier.id,
        pedido: {
          estadoCumplimiento: {
            notIn: ['entregado', 'cancelado'],
          },
        },
      },
      include: assignmentInclude,
      orderBy: { asignadoEn: 'desc' },
    });

    return assignments.map((assignment) => this.mapAssignment(assignment));
  }

  async listCouriers(current: AuthenticatedUser) {
    const couriers = await this.prisma.repartidor.findMany({
      where: {
        activo: true,
        usuario: { negocioId: current.negocioId },
      },
      include: {
        usuario: { select: { id: true, nombre: true, username: true } },
      },
      orderBy: { usuario: { nombre: 'asc' } },
    });

    return couriers.map((courier) => ({
      id: courier.id,
      nombre: courier.usuario.nombre,
      username: courier.usuario.username,
      vehiculo: courier.vehiculo,
    }));
  }

  async assign(
    orderId: string,
    dto: AssignDeliveryDto,
    current: AuthenticatedUser,
  ) {
    const order = await this.prisma.pedido.findFirst({
      where: {
        id: orderId,
        negocioId: current.negocioId,
        sucursalId: current.sucursalId,
      },
    });

    if (!order) {
      throw new NotFoundException('Pedido no encontrado');
    }

    if (order.tipoServicio !== 'domicilio' && order.canal !== 'domicilio') {
      throw new BadRequestException('Solo se pueden asignar pedidos de domicilio');
    }

    if (
      !['confirmado', 'en_preparacion', 'listo'].includes(
        order.estadoCumplimiento,
      )
    ) {
      throw new ConflictException(
        'El pedido no está disponible para asignar',
      );
    }

    const courier = await this.prisma.repartidor.findUnique({
      where: { id: dto.repartidorId },
      include: { usuario: true },
    });

    if (
      !courier ||
      !courier.activo ||
      courier.usuario.negocioId !== current.negocioId
    ) {
      throw new NotFoundException('Repartidor no encontrado');
    }

    const existing = await this.prisma.asignacionRepartidor.findFirst({
      where: { pedidoId: orderId, liquidacionId: null },
      include: assignmentInclude,
    });

    if (existing) {
      if (existing.repartidorId === courier.id) {
        return this.mapAssignment(existing);
      }

      if (existing.entregadoEn) {
        throw new ConflictException('El pedido ya fue entregado');
      }

      const updated = await this.prisma.asignacionRepartidor.update({
        where: { id: existing.id },
        data: {
          repartidorId: courier.id,
          asignadoEn: new Date(),
          salidaEn: null,
        },
        include: assignmentInclude,
      });

      await this.audit.log({
        negocioId: current.negocioId,
        sucursalId: current.sucursalId,
        usuarioId: current.id,
        accion: 'repartidor.asignar',
        entidad: 'asignacion_repartidor',
        entidadId: updated.id,
        datosDespues: {
          pedidoId: orderId,
          repartidorId: courier.id,
        } as Prisma.InputJsonValue,
      });

      return this.mapAssignment(updated);
    }

    const created = await this.prisma.asignacionRepartidor.create({
      data: { pedidoId: orderId, repartidorId: courier.id },
      include: assignmentInclude,
    });

    await this.audit.log({
      negocioId: current.negocioId,
      sucursalId: current.sucursalId,
      usuarioId: current.id,
      accion: 'repartidor.asignar',
      entidad: 'asignacion_repartidor',
      entidadId: created.id,
      datosDespues: {
        pedidoId: orderId,
        repartidorId: courier.id,
      } as Prisma.InputJsonValue,
    });

    return this.mapAssignment(created);
  }

  async start(orderId: string, current: AuthenticatedUser) {
    const courier = await this.getCourier(current);
    const assignment = await this.findAssignment(orderId, courier.id);

    if (assignment.entregadoEn) {
      throw new ConflictException('El pedido ya fue entregado');
    }

    if (assignment.pedido.estadoCumplimiento !== 'listo') {
      throw new ConflictException('El pedido todavía no está listo');
    }

    if (assignment.salidaEn) {
      return this.mapAssignment(assignment);
    }

    const updated = await this.prisma.asignacionRepartidor.update({
      where: { id: assignment.id },
      data: { salidaEn: new Date() },
      include: assignmentInclude,
    });

    await this.audit.log({
      negocioId: current.negocioId,
      sucursalId: current.sucursalId,
      usuarioId: current.id,
      accion: 'repartidor.salida',
      entidad: 'asignacion_repartidor',
      entidadId: updated.id,
      datosDespues: { pedidoId: orderId } as Prisma.InputJsonValue,
    });

    return this.mapAssignment(updated);
  }

  async deliver(
    orderId: string,
    dto: DeliverOrderDto,
    current: AuthenticatedUser,
  ) {
    const courier = await this.getCourier(current);
    const assignment = await this.findAssignment(orderId, courier.id);

    if (assignment.entregadoEn) {
      throw new ConflictException('El pedido ya fue entregado');
    }

    if (assignment.pedido.estadoCumplimiento !== 'listo') {
      throw new ConflictException('El pedido todavía no está listo');
    }

    let cash: Prisma.Decimal | null = null;

    if (dto.efectivoCobrado) {
      cash = new Prisma.Decimal(dto.efectivoCobrado);

      if (cash.lessThan(0)) {
        throw new BadRequestException('El efectivo cobrado no puede ser negativo');
      }
    }

    await this.ordersService.markOrderDelivered(orderId, current);

    const updated = await this.prisma.asignacionRepartidor.update({
      where: { id: assignment.id },
      data: {
        entregadoEn: new Date(),
        efectivoCobrado: cash?.toFixed(2) ?? null,
      },
      include: assignmentInclude,
    });

    await this.audit.log({
      negocioId: current.negocioId,
      sucursalId: current.sucursalId,
      usuarioId: current.id,
      accion: 'repartidor.entregar',
      entidad: 'asignacion_repartidor',
      entidadId: updated.id,
      datosDespues: {
        pedidoId: orderId,
        efectivoCobrado: updated.efectivoCobrado?.toFixed(2) ?? null,
      } as Prisma.InputJsonValue,
    });

    return this.mapAssignment(updated);
  }

  async currentLiquidation(current: AuthenticatedUser) {
    const courier = await this.getCourier(current);
    const assignments = await this.pendingLiquidationAssignments(courier.id);
    const total = assignments.reduce(
      (sum, assignment) =>
        sum.plus(assignment.efectivoCobrado ?? new Prisma.Decimal(0)),
      new Prisma.Decimal(0),
    );

    return {
      repartidor: {
        id: courier.id,
        nombre: courier.usuario.nombre,
        username: courier.usuario.username,
        vehiculo: courier.vehiculo,
      },
      totalCobrado: total.toFixed(2),
      totalPedidos: assignments.length,
      orders: assignments.map((assignment) => this.mapAssignment(assignment)),
    };
  }

  async listPendingLiquidations(current: AuthenticatedUser) {
    const assignments = await this.prisma.asignacionRepartidor.findMany({
      where: {
        entregadoEn: { not: null },
        liquidacionId: null,
        pedido: { negocioId: current.negocioId },
      },
      include: pendingInclude,
      orderBy: { entregadoEn: 'asc' },
    });

    const groups = new Map<
      string,
      {
        repartidor: PendingAssignment['repartidor'];
        total: Prisma.Decimal;
        assignments: PendingAssignment[];
      }
    >();

    for (const assignment of assignments) {
      const currentGroup = groups.get(assignment.repartidorId);

      if (currentGroup) {
        currentGroup.total = currentGroup.total.plus(
          assignment.efectivoCobrado ?? new Prisma.Decimal(0),
        );
        currentGroup.assignments.push(assignment);
      } else {
        groups.set(assignment.repartidorId, {
          repartidor: assignment.repartidor,
          total: new Prisma.Decimal(
            assignment.efectivoCobrado ?? new Prisma.Decimal(0),
          ),
          assignments: [assignment],
        });
      }
    }

    return Array.from(groups.values()).map((group) => ({
      repartidor: {
        id: group.repartidor.id,
        nombre: group.repartidor.usuario.nombre,
        username: group.repartidor.usuario.username,
        vehiculo: group.repartidor.vehiculo,
      },
      totalCobrado: group.total.toFixed(2),
      totalPedidos: group.assignments.length,
      orders: group.assignments.map((assignment) =>
        this.mapAssignment(assignment),
      ),
    }));
  }

  async listLiquidations(current: AuthenticatedUser) {
    const courier = await this.getCourier(current);
    const liquidations = await this.prisma.liquidacionRepartidor.findMany({
      where: {
        repartidorId: courier.id,
        negocioId: current.negocioId,
      },
      orderBy: { creadoEn: 'desc' },
      take: 20,
      include: { asignaciones: true },
    });

    return liquidations.map((liquidation) => ({
      id: liquidation.id,
      fechaOperativa: liquidation.fechaOperativa.toISOString().slice(0, 10),
      totalCobrado: liquidation.totalCobrado.toFixed(2),
      totalEntregado: liquidation.totalEntregado.toFixed(2),
      diferencia: liquidation.diferencia.toFixed(2),
      estado: liquidation.estado,
      observaciones: liquidation.observaciones,
      creadoEn: liquidation.creadoEn,
      cerradaEn: liquidation.cerradaEn,
      totalPedidos: liquidation.asignaciones.length,
    }));
  }

  async createLiquidation(
    dto: CreateLiquidationDto,
    current: AuthenticatedUser,
  ) {
    const courier = dto.repartidorId
      ? await this.prisma.repartidor.findUnique({
          where: { id: dto.repartidorId },
          include: { usuario: true },
        })
      : await this.getCourier(current);

    if (
      !courier ||
      !courier.activo ||
      courier.usuario.negocioId !== current.negocioId
    ) {
      throw new NotFoundException('Repartidor no encontrado');
    }

    const assignments = await this.pendingLiquidationAssignments(courier.id);

    if (!assignments.length) {
      throw new ConflictException('No hay entregas pendientes de liquidar');
    }

    const totalCobrado = assignments.reduce(
      (sum, assignment) =>
        sum.plus(assignment.efectivoCobrado ?? new Prisma.Decimal(0)),
      new Prisma.Decimal(0),
    );
    const totalEntregado = new Prisma.Decimal(dto.totalEntregado);
    const diferencia = totalEntregado.minus(totalCobrado);
    const estado = diferencia.equals(0) ? 'liquidada' : 'con_diferencia';

    const liquidation = await this.prisma.$transaction(async (tx) => {
      const created = await tx.liquidacionRepartidor.create({
        data: {
          negocioId: current.negocioId,
          sucursalId: current.sucursalId,
          repartidorId: courier.id,
          fechaOperativa: new Date(),
          totalCobrado: totalCobrado.toFixed(2),
          totalEntregado: totalEntregado.toFixed(2),
          diferencia: diferencia.toFixed(2),
          estado,
          observaciones: dto.observaciones ?? null,
          cerradaEn: new Date(),
        },
      });

      await tx.asignacionRepartidor.updateMany({
        where: { id: { in: assignments.map((assignment) => assignment.id) } },
        data: { liquidacionId: created.id },
      });

      return created;
    });

    await this.audit.log({
      negocioId: current.negocioId,
      sucursalId: current.sucursalId,
      usuarioId: current.id,
      accion: 'repartidor.liquidar',
      entidad: 'liquidacion_repartidor',
      entidadId: liquidation.id,
      datosDespues: {
        repartidorId: courier.id,
        totalCobrado: liquidation.totalCobrado.toFixed(2),
        totalEntregado: liquidation.totalEntregado.toFixed(2),
        diferencia: liquidation.diferencia.toFixed(2),
        estado,
      } as Prisma.InputJsonValue,
    });

    return {
      id: liquidation.id,
      fechaOperativa: liquidation.fechaOperativa.toISOString().slice(0, 10),
      totalCobrado: liquidation.totalCobrado.toFixed(2),
      totalEntregado: liquidation.totalEntregado.toFixed(2),
      diferencia: liquidation.diferencia.toFixed(2),
      estado: liquidation.estado,
      observaciones: liquidation.observaciones,
      creadoEn: liquidation.creadoEn,
      cerradaEn: liquidation.cerradaEn,
      totalPedidos: assignments.length,
    };
  }

  private async getCourier(current: AuthenticatedUser) {
    const courier = await this.prisma.repartidor.findUnique({
      where: { usuarioId: current.id },
      include: { usuario: true },
    });

    if (
      !courier ||
      !courier.activo ||
      courier.usuario.negocioId !== current.negocioId
    ) {
      throw new NotFoundException('Repartidor no encontrado');
    }

    return courier;
  }

  private async findAssignment(orderId: string, repartidorId: string) {
    const assignment = await this.prisma.asignacionRepartidor.findFirst({
      where: { pedidoId: orderId, repartidorId },
      include: assignmentInclude,
    });

    if (!assignment) {
      throw new NotFoundException('Pedido no asignado');
    }

    return assignment;
  }

  private pendingLiquidationAssignments(repartidorId: string) {
    return this.prisma.asignacionRepartidor.findMany({
      where: {
        repartidorId,
        entregadoEn: { not: null },
        liquidacionId: null,
      },
      include: assignmentInclude,
      orderBy: { entregadoEn: 'asc' },
    });
  }

  private mapAssignment(assignment: AssignmentWithOrder) {
    const order = assignment.pedido;

    return {
      assignmentId: assignment.id,
      orderId: order.id,
      codigoPublico: order.codigoPublico,
      estadoCumplimiento: order.estadoCumplimiento,
      estadoPago: order.estadoPago,
      total: order.total.toFixed(2),
      moneda: {
        codigo: order.moneda.codigo,
        simbolo: order.moneda.simbolo,
      },
      cliente: {
        nombre: order.clienteNombre ?? order.cliente?.nombre ?? null,
        telefono: order.clienteTelefono ?? order.cliente?.telefono ?? null,
        direccion:
          order.direccionEntrega ?? order.cliente?.direccion ?? null,
      },
      notas: order.notas,
      items: order.items.map((item) => ({
        id: item.id,
        productoNombre: item.productoNombre,
        cantidad: item.cantidad,
        subtotal: item.subtotal.toFixed(2),
        notas: item.notas,
        modificadores: item.modificadores.map((modifier) => ({
          nombre: modifier.nombre,
          precioExtra: modifier.precioExtra.toFixed(2),
        })),
      })),
      asignadoEn: assignment.asignadoEn,
      salidaEn: assignment.salidaEn,
      entregadoEn: assignment.entregadoEn,
      efectivoCobrado: assignment.efectivoCobrado?.toFixed(2) ?? null,
    };
  }
}
