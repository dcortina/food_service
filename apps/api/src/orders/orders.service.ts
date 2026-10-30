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
import { RealtimeService } from '../realtime/realtime.service';
import { BusinessDayService } from './business-day.service';
import { CancelOrderDto } from './dto/cancel-order.dto';
import { ListOrdersQueryDto } from './dto/list-orders-query.dto';
import {
  CreateOrderDto,
  OrderCustomerDto,
  OrderItemDto,
} from './dto/order.dto';
import { PublicCreateOrderDto } from './dto/public-order.dto';
import { UpdateItemStatusDto } from './dto/update-item-status.dto';

interface OrderActor {
  negocioId: string;
  sucursalId: string;
  usuarioId: string | null;
}

interface PricedItem {
  productoId: string;
  productoNombre: string;
  cantidad: number;
  precioUnitario: string;
  monedaId: string;
  tasaCambioAplicada: string;
  subtotal: string;
  notas: string | null;
  tiempoPreparacionMin: number;
  modificadores: Array<{
    modificadorId: string;
    nombre: string;
    tipo: 'agregar' | 'quitar' | 'nota';
    precioExtra: string;
  }>;
}

const orderInclude = {
  mesa: { include: { zona: true } },
  cliente: true,
  moneda: true,
  creadoPor: { select: { id: true, nombre: true, username: true } },
  canceladoPor: { select: { id: true, nombre: true, username: true } },
  items: {
    orderBy: { orden: 'asc' },
    include: {
      modificadores: true,
      producto: { select: { id: true, nombre: true } },
    },
  },
  pagos: true,
} satisfies Prisma.PedidoInclude;

type OrderWithRelations = Prisma.PedidoGetPayload<{
  include: typeof orderInclude;
}>;

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly businessDay: BusinessDayService,
    private readonly audit: AuditService,
    private readonly realtime: RealtimeService,
  ) {}

  async createOrder(dto: CreateOrderDto, current: AuthenticatedUser) {
    const order = await this.createOrderInternal(
      dto,
      this.actorFromUser(current),
    );
    return this.mapOrder(order);
  }

  async createPublicOrder(dto: PublicCreateOrderDto) {
    const mesa = await this.prisma.mesa.findUnique({
      where: { codigoQr: dto.codigoQr },
      include: {
        zona: {
          include: {
            sucursal: { include: { negocio: true } },
          },
        },
      },
    });

    if (
      !mesa ||
      !mesa.activo ||
      !mesa.zona.activo ||
      !mesa.zona.sucursal.activo ||
      !mesa.zona.sucursal.negocio.activo
    ) {
      throw new NotFoundException('Mesa no encontrada');
    }

    const actor: OrderActor = {
      negocioId: mesa.zona.sucursal.negocioId,
      sucursalId: mesa.zona.sucursalId,
      usuarioId: null,
    };

    const order = await this.createOrderInternal(
      {
        canal: 'qr_mesa',
        tipoServicio: 'mesa',
        mesaId: mesa.id,
        cliente: dto.cliente,
        items: dto.items,
        notas: dto.notas,
        idempotencyKey: dto.idempotencyKey,
      },
      actor,
    );

    return this.mapPublicOrder(order);
  }

  async getPublicOrderStatus(id: string, codigoQr: string) {
    const order = await this.prisma.pedido.findFirst({
      where: {
        id,
        canal: 'qr_mesa',
        mesa: { codigoQr },
      },
      include: orderInclude,
    });

    if (!order) {
      throw new NotFoundException('Pedido no encontrado');
    }

    return this.mapPublicOrder(order);
  }

  async listOrders(
    query: ListOrdersQueryDto,
    current: AuthenticatedUser,
  ) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where: Prisma.PedidoWhereInput = {
      negocioId: current.negocioId,
      sucursalId: current.sucursalId,
      ...(query.estado ? { estadoCumplimiento: query.estado } : {}),
      ...(query.canal ? { canal: query.canal } : {}),
      ...(query.mesaId ? { mesaId: query.mesaId } : {}),
      ...(query.fecha
        ? { fechaOperativa: new Date(`${query.fecha}T00:00:00.000Z`) }
        : {}),
      ...(query.search
        ? {
            OR: [
              {
                codigoPublico: {
                  contains: query.search,
                  mode: 'insensitive',
                },
              },
              {
                clienteNombre: {
                  contains: query.search,
                  mode: 'insensitive',
                },
              },
              {
                clienteTelefono: {
                  contains: query.search,
                  mode: 'insensitive',
                },
              },
            ],
          }
        : {}),
    };

    const [total, orders] = await this.prisma.$transaction([
      this.prisma.pedido.count({ where }),
      this.prisma.pedido.findMany({
        where,
        include: orderInclude,
        orderBy: { creadoEn: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return {
      data: orders.map((order) => this.mapOrder(order)),
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async findOrder(id: string, current: AuthenticatedUser) {
    const order = await this.findOrderEntity(id, this.actorFromUser(current));
    return this.mapOrder(order);
  }

  async confirmOrder(id: string, current: AuthenticatedUser) {
    const actor = this.actorFromUser(current);
    const order = await this.findOrderEntity(id, actor);

    if (order.estadoCumplimiento !== 'nuevo') {
      throw new ConflictException(
        'Solo se puede confirmar un pedido en estado nuevo',
      );
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.pedido.update({
        where: { id },
        data: {
          estadoCumplimiento: 'confirmado',
          confirmadoEn: new Date(),
        },
        include: orderInclude,
      });

      await this.writeOutbox(tx, result, 'pedido.confirmado');
      return result;
    });

    await this.audit.log({
      negocioId: actor.negocioId,
      sucursalId: actor.sucursalId,
      usuarioId: actor.usuarioId,
      accion: 'pedido.confirmar',
      entidad: 'pedido',
      entidadId: id,
      datosAntes: this.auditPayload(this.mapOrder(order)),
      datosDespues: this.auditPayload(this.mapOrder(updated)),
    });

    this.realtime.emitOrderUpdated(updated);
    return this.mapOrder(updated);
  }

  async cancelOrder(
    id: string,
    dto: CancelOrderDto,
    current: AuthenticatedUser,
  ) {
    const actor = this.actorFromUser(current);
    const order = await this.findOrderEntity(id, actor);

    if (
      order.estadoCumplimiento === 'cancelado' ||
      order.estadoCumplimiento === 'entregado'
    ) {
      throw new ConflictException(
        'No se puede cancelar un pedido en ese estado',
      );
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.pedido.update({
        where: { id },
        data: {
          estadoCumplimiento: 'cancelado',
          canceladoMotivo: dto.motivo,
          canceladoPorId: actor.usuarioId,
        },
        include: orderInclude,
      });

      if (order.mesaId) {
        await this.releaseTableIfIdle(tx, order.mesaId, id);
      }

      await this.writeOutbox(tx, result, 'pedido.cancelado');
      return result;
    });

    await this.audit.log({
      negocioId: actor.negocioId,
      sucursalId: actor.sucursalId,
      usuarioId: actor.usuarioId,
      accion: 'pedido.cancelar',
      entidad: 'pedido',
      entidadId: id,
      motivo: dto.motivo,
      datosAntes: this.auditPayload(this.mapOrder(order)),
      datosDespues: this.auditPayload(this.mapOrder(updated)),
    });

    this.realtime.emitOrderUpdated(updated);
    return this.mapOrder(updated);
  }

  async updateItemStatus(
    orderId: string,
    itemId: string,
    dto: UpdateItemStatusDto,
    current: AuthenticatedUser,
  ) {
    const actor = this.actorFromUser(current);
    const order = await this.findOrderEntity(orderId, actor);

    if (
      order.estadoCumplimiento !== 'confirmado' &&
      order.estadoCumplimiento !== 'en_preparacion'
    ) {
      throw new ConflictException(
        'El pedido debe estar confirmado o en preparación',
      );
    }

    const item = order.items.find((entry) => entry.id === itemId);
    if (!item) {
      throw new NotFoundException('Ítem no encontrado');
    }

    if (
      dto.estado === 'en_preparacion' &&
      item.estadoItem !== 'pendiente'
    ) {
      throw new ConflictException(
        'El ítem ya fue iniciado o está listo',
      );
    }

    if (dto.estado === 'listo' && item.estadoItem !== 'en_preparacion') {
      throw new ConflictException(
        'El ítem debe estar en preparación para marcarlo listo',
      );
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.pedidoItem.update({
        where: { id: itemId },
        data: {
          estadoItem: dto.estado,
          ...(dto.estado === 'en_preparacion'
            ? { enPreparacionEn: new Date() }
            : { listoEn: new Date() }),
        },
      });

      const items = await tx.pedidoItem.findMany({
        where: { pedidoId: orderId },
      });
      const allReady = items.every((entry) => entry.estadoItem === 'listo');
      const anyPreparing = items.some(
        (entry) => entry.estadoItem === 'en_preparacion',
      );
      const nextState = allReady
        ? ('listo' as const)
        : anyPreparing
          ? ('en_preparacion' as const)
          : order.estadoCumplimiento;

      const data: Prisma.PedidoUpdateInput = {};
      if (nextState !== order.estadoCumplimiento) {
        data.estadoCumplimiento = nextState;
        if (nextState === 'en_preparacion' && !order.enPreparacionEn) {
          data.enPreparacionEn = new Date();
        }
        if (nextState === 'listo') {
          data.listoEn = new Date();
        }
      }

      const result = await tx.pedido.update({
        where: { id: orderId },
        data,
        include: orderInclude,
      });

      await this.writeOutbox(tx, result, 'pedido.item.actualizado', {
        itemId,
        estadoItem: dto.estado,
      });

      return result;
    });

    await this.audit.log({
      negocioId: actor.negocioId,
      sucursalId: actor.sucursalId,
      usuarioId: actor.usuarioId,
      accion: 'pedido.item.estado',
      entidad: 'pedido_item',
      entidadId: itemId,
      motivo: dto.estado,
      datosAntes: this.auditPayload(this.mapOrder(order)),
      datosDespues: this.auditPayload(this.mapOrder(updated)),
    });

    this.realtime.emitItemUpdated(updated, itemId, dto.estado);
    this.realtime.emitOrderUpdated(updated);
    return this.mapOrder(updated);
  }

  async markOrderReady(orderId: string, current: AuthenticatedUser) {
    const actor = this.actorFromUser(current);
    const order = await this.findOrderEntity(orderId, actor);

    if (
      order.estadoCumplimiento !== 'confirmado' &&
      order.estadoCumplimiento !== 'en_preparacion'
    ) {
      throw new ConflictException(
        'El pedido debe estar confirmado o en preparación',
      );
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.pedidoItem.updateMany({
        where: {
          pedidoId: orderId,
          estadoItem: { not: 'listo' },
        },
        data: {
          estadoItem: 'listo',
          listoEn: new Date(),
        },
      });

      const result = await tx.pedido.update({
        where: { id: orderId },
        data: {
          estadoCumplimiento: 'listo',
          listoEn: new Date(),
        },
        include: orderInclude,
      });

      await this.writeOutbox(tx, result, 'pedido.listo');
      return result;
    });

    await this.audit.log({
      negocioId: actor.negocioId,
      sucursalId: actor.sucursalId,
      usuarioId: actor.usuarioId,
      accion: 'pedido.estado',
      entidad: 'pedido',
      entidadId: orderId,
      motivo: 'listo',
      datosAntes: this.auditPayload(this.mapOrder(order)),
      datosDespues: this.auditPayload(this.mapOrder(updated)),
    });

    this.realtime.emitOrderUpdated(updated);
    return this.mapOrder(updated);
  }

  async markOrderDelivered(orderId: string, current: AuthenticatedUser) {
    const actor = this.actorFromUser(current);
    const order = await this.findOrderEntity(orderId, actor);

    if (order.estadoCumplimiento !== 'listo') {
      throw new ConflictException(
        'El pedido debe estar listo para entregarse',
      );
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.pedido.update({
        where: { id: orderId },
        data: {
          estadoCumplimiento: 'entregado',
          entregadoEn: new Date(),
        },
        include: orderInclude,
      });

      if (order.mesaId) {
        await this.releaseTableIfIdle(tx, order.mesaId, orderId);
      }

      await this.writeOutbox(tx, result, 'pedido.entregado');
      return result;
    });

    await this.audit.log({
      negocioId: actor.negocioId,
      sucursalId: actor.sucursalId,
      usuarioId: actor.usuarioId,
      accion: 'pedido.entregar',
      entidad: 'pedido',
      entidadId: orderId,
      datosAntes: this.auditPayload(this.mapOrder(order)),
      datosDespues: this.auditPayload(this.mapOrder(updated)),
    });

    this.realtime.emitOrderUpdated(updated);
    return this.mapOrder(updated);
  }

  async listKdsOrders(current: AuthenticatedUser) {
    const orders = await this.prisma.pedido.findMany({
      where: {
        negocioId: current.negocioId,
        sucursalId: current.sucursalId,
        estadoCumplimiento: {
          in: ['confirmado', 'en_preparacion', 'listo'],
        },
      },
      include: orderInclude,
      orderBy: { creadoEn: 'asc' },
    });

    return orders.map((order) => ({
      ...this.mapOrder(order),
      elapsedMinutes: Math.max(
        0,
        Math.floor((Date.now() - order.creadoEn.getTime()) / 60_000),
      ),
    }));
  }

  private async createOrderInternal(
    dto: CreateOrderDto,
    actor: OrderActor,
  ): Promise<OrderWithRelations> {
    const sucursal = await this.prisma.sucursal.findFirst({
      where: {
        id: actor.sucursalId,
        negocioId: actor.negocioId,
        activo: true,
      },
    });

    if (!sucursal) {
      throw new NotFoundException('Sucursal no encontrada');
    }

    const negocio = await this.prisma.negocio.findFirst({
      where: { id: actor.negocioId, activo: true },
      include: { monedaPrincipal: true },
    });

    if (!negocio) {
      throw new NotFoundException('Negocio no encontrado');
    }

    if (dto.mesaId) {
      const mesa = await this.prisma.mesa.findFirst({
        where: {
          id: dto.mesaId,
          zona: { sucursalId: actor.sucursalId },
          activo: true,
        },
      });

      if (!mesa) {
        throw new NotFoundException('Mesa no encontrada');
      }
    }

    if (dto.tipoServicio === 'mesa' && !dto.mesaId) {
      throw new BadRequestException('La mesa es obligatoria');
    }

    const idempotencyKey = dto.idempotencyKey ?? randomUUID();
    const existing = await this.prisma.pedido.findUnique({
      where: {
        negocioId_idempotencyKey: {
          negocioId: actor.negocioId,
          idempotencyKey,
        },
      },
      include: orderInclude,
    });

    if (existing) {
      return existing;
    }

    const clienteId = await this.resolveCustomer(
      dto.cliente,
      actor.negocioId,
    );

    const { items, subtotal } = await this.priceItems(
      dto.items,
      negocio,
      actor,
    );

    const subtotalDecimal = new Prisma.Decimal(subtotal);
    const discount = dto.descuento
      ? new Prisma.Decimal(dto.descuento)
      : new Prisma.Decimal(0);

    if (discount.greaterThan(subtotalDecimal)) {
      throw new BadRequestException(
        'El descuento no puede superar el subtotal',
      );
    }

    const taxable = subtotalDecimal.minus(discount);
    const tax = taxable.times(negocio.impuestoPorcentaje).div(100);
    const total = taxable.plus(tax);
    const etaMinutos = Math.max(
      ...items.map((item) => item.tiempoPreparacionMin),
    );
    const businessDay = this.businessDay.getBusinessDay(negocio);

    const created = await this.prisma.$transaction(async (tx) => {
      const numeroDia = await this.nextDailyNumber(
        tx,
        actor.sucursalId,
        businessDay.dateString,
      );
      const codigoPublico = `#${String(numeroDia).padStart(3, '0')}`;

      const order = await tx.pedido.create({
        data: {
          negocioId: actor.negocioId,
          sucursalId: actor.sucursalId,
          fechaOperativa: businessDay.date,
          numeroDia,
          codigoPublico,
          canal: dto.canal,
          tipoServicio: dto.tipoServicio,
          mesaId: dto.mesaId ?? null,
          clienteId,
          clienteNombre: dto.cliente?.nombre ?? null,
          clienteTelefono: dto.cliente?.telefono ?? null,
          direccionEntrega: dto.cliente?.direccion ?? null,
          estadoCumplimiento: 'nuevo',
          estadoPago: 'pendiente',
          subtotal: subtotalDecimal.toFixed(2),
          descuento: discount.toFixed(2),
          impuesto: tax.toFixed(2),
          total: total.toFixed(2),
          monedaId: negocio.monedaPrincipalId,
          tasaCambioAplicada: '1.000000',
          notas: dto.notas ?? null,
          etaMinutos,
          idempotencyKey,
          creadoPorId: actor.usuarioId,
          items: {
            create: items.map((item, index) => ({
              producto: { connect: { id: item.productoId } },
              productoNombre: item.productoNombre,
              cantidad: item.cantidad,
              precioUnitario: item.precioUnitario,
              moneda: { connect: { id: item.monedaId } },
              tasaCambioAplicada: item.tasaCambioAplicada,
              subtotal: item.subtotal,
              notas: item.notas,
              estadoItem: 'pendiente',
              orden: index,
              modificadores: {
                create: item.modificadores.map((modifier) => ({
                  modificador: {
                    connect: { id: modifier.modificadorId },
                  },
                  nombre: modifier.nombre,
                  tipo: modifier.tipo,
                  precioExtra: modifier.precioExtra,
                })),
              },
            })),
          },
        },
        include: orderInclude,
      });

      if (dto.mesaId) {
        await tx.mesa.update({
          where: { id: dto.mesaId },
          data: { estado: 'ocupada' },
        });
      }

      await this.writeOutbox(tx, order, 'pedido.creado');
      return order;
    });

    await this.audit.log({
      negocioId: actor.negocioId,
      sucursalId: actor.sucursalId,
      usuarioId: actor.usuarioId,
      accion: 'pedido.crear',
      entidad: 'pedido',
      entidadId: created.id,
      datosDespues: this.auditPayload(this.mapOrder(created)),
    });

    this.realtime.emitOrderCreated(created);
    return created;
  }

  private async priceItems(
    items: OrderItemDto[],
    negocio: { monedaPrincipalId: string },
    actor: OrderActor,
  ): Promise<{ items: PricedItem[]; subtotal: Prisma.Decimal }> {
    const productIds = [...new Set(items.map((item) => item.productoId))];
    const products = await this.prisma.producto.findMany({
      where: {
        id: { in: productIds },
        categoria: { negocioId: actor.negocioId },
        activo: true,
      },
      include: {
        precios: { where: { monedaId: negocio.monedaPrincipalId } },
        gruposModificadores: {
          include: {
            grupo: { include: { modificadores: true } },
          },
        },
      },
    });

    const productMap = new Map(
      products.map((product) => [product.id, product]),
    );
    let subtotal = new Prisma.Decimal(0);
    const pricedItems: PricedItem[] = [];

    for (const [index, item] of items.entries()) {
      const product = productMap.get(item.productoId);
      if (!product) {
        throw new NotFoundException(
          `Producto no encontrado: ${item.productoId}`,
        );
      }

      if (!product.disponible) {
        throw new ConflictException(
          `Producto no disponible: ${product.nombre}`,
        );
      }

      const price = product.precios[0];
      if (!price) {
        throw new ConflictException(
          `Producto sin precio en la moneda principal: ${product.nombre}`,
        );
      }

      const basePrice = new Prisma.Decimal(price.precio);
      const allowedModifiers = product.gruposModificadores.flatMap(
        (link) =>
          link.grupo.modificadores.map((modifier) => ({
            ...modifier,
            grupoId: link.grupoId,
            grupoNombre: link.grupo.nombre,
            minSeleccion: link.grupo.minSeleccion,
            maxSeleccion: link.grupo.maxSeleccion,
            obligatorio: link.grupo.obligatorio,
          })),
      );
      const allowedMap = new Map(
        allowedModifiers.map((modifier) => [modifier.id, modifier]),
      );
      const selectedIds =
        item.modificadores?.map((modifier) => modifier.modificadorId) ??
        [];
      const selected = selectedIds.map((id) => {
        const modifier = allowedMap.get(id);
        if (!modifier) {
          throw new BadRequestException(
            `Modificador no válido para ${product.nombre}: ${id}`,
          );
        }
        return modifier;
      });

      for (const link of product.gruposModificadores) {
        const count = selected.filter(
          (modifier) => modifier.grupoId === link.grupoId,
        ).length;

        if (
          count < link.grupo.minSeleccion ||
          count > link.grupo.maxSeleccion
        ) {
          throw new BadRequestException(
            `El grupo ${link.grupo.nombre} requiere entre ${link.grupo.minSeleccion} y ${link.grupo.maxSeleccion} opciones`,
          );
        }

        if (link.grupo.obligatorio && count < 1) {
          throw new BadRequestException(
            `El grupo ${link.grupo.nombre} es obligatorio`,
          );
        }
      }

      const extraTotal = selected.reduce(
        (sum, modifier) =>
          sum.plus(new Prisma.Decimal(modifier.precioExtra)),
        new Prisma.Decimal(0),
      );
      const lineSubtotal = basePrice
        .plus(extraTotal)
        .times(item.cantidad);

      subtotal = subtotal.plus(lineSubtotal);

      pricedItems.push({
        productoId: product.id,
        productoNombre: product.nombre,
        cantidad: item.cantidad,
        precioUnitario: basePrice.toFixed(2),
        monedaId: negocio.monedaPrincipalId,
        tasaCambioAplicada: '1.000000',
        subtotal: lineSubtotal.toFixed(2),
        notas: item.notas ?? null,
        tiempoPreparacionMin: product.tiempoPreparacionMin,
        modificadores: selected.map((modifier) => ({
          modificadorId: modifier.id,
          nombre: modifier.nombre,
          tipo: modifier.tipo,
          precioExtra: modifier.precioExtra.toFixed(2),
        })),
      });
    }

    return { items: pricedItems, subtotal };
  }

  private async resolveCustomer(
    cliente: OrderCustomerDto | undefined,
    negocioId: string,
  ): Promise<string | null> {
    if (!cliente?.telefono) return null;

    const existing = await this.prisma.cliente.findFirst({
      where: { negocioId, telefono: cliente.telefono },
    });

    if (existing) {
      if (cliente.nombre || cliente.direccion) {
        const updated = await this.prisma.cliente.update({
          where: { id: existing.id },
          data: {
            ...(cliente.nombre ? { nombre: cliente.nombre } : {}),
            ...(cliente.direccion
              ? { direccion: cliente.direccion }
              : {}),
          },
        });
        return updated.id;
      }
      return existing.id;
    }

    const created = await this.prisma.cliente.create({
      data: {
        negocioId,
        nombre: cliente.nombre ?? null,
        telefono: cliente.telefono,
        direccion: cliente.direccion ?? null,
      },
    });

    return created.id;
  }

  private async nextDailyNumber(
    tx: Prisma.TransactionClient,
    sucursalId: string,
    dateString: string,
  ): Promise<number> {
    const rows = await tx.$queryRaw<Array<{ ultimo_numero: number }>>`
      INSERT INTO contador_diario (id, sucursal_id, fecha_operativa, ultimo_numero)
      VALUES (gen_random_uuid(), ${sucursalId}::uuid, ${dateString}::date, 1)
      ON CONFLICT (sucursal_id, fecha_operativa)
      DO UPDATE SET ultimo_numero = contador_diario.ultimo_numero + 1
      RETURNING ultimo_numero;
    `;

    return Number(rows[0]?.ultimo_numero ?? 1);
  }

  private async releaseTableIfIdle(
    tx: Prisma.TransactionClient,
    mesaId: string,
    orderId: string,
  ) {
    const active = await tx.pedido.count({
      where: {
        mesaId,
        id: { not: orderId },
        estadoCumplimiento: {
          notIn: ['entregado', 'cancelado'],
        },
      },
    });

    if (active === 0) {
      await tx.mesa.update({
        where: { id: mesaId },
        data: { estado: 'libre' },
      });
    }
  }

  private async findOrderEntity(
    id: string,
    actor: OrderActor,
  ): Promise<OrderWithRelations> {
    const order = await this.prisma.pedido.findFirst({
      where: {
        id,
        negocioId: actor.negocioId,
        sucursalId: actor.sucursalId,
      },
      include: orderInclude,
    });

    if (!order) {
      throw new NotFoundException('Pedido no encontrado');
    }

    return order;
  }

  private actorFromUser(user: AuthenticatedUser): OrderActor {
    return {
      negocioId: user.negocioId,
      sucursalId: user.sucursalId,
      usuarioId: user.id,
    };
  }

  private mapOrder(order: OrderWithRelations) {
    return {
      id: order.id,
      negocioId: order.negocioId,
      sucursalId: order.sucursalId,
      fechaOperativa: order.fechaOperativa.toISOString().slice(0, 10),
      numeroDia: order.numeroDia,
      codigoPublico: order.codigoPublico,
      canal: order.canal,
      tipoServicio: order.tipoServicio,
      mesa: order.mesa
        ? {
            id: order.mesa.id,
            numero: order.mesa.numero,
            zona: {
              id: order.mesa.zona.id,
              nombre: order.mesa.zona.nombre,
            },
          }
        : null,
      cliente: order.cliente
        ? {
            id: order.cliente.id,
            nombre: order.cliente.nombre,
            telefono: order.cliente.telefono,
            direccion: order.cliente.direccion,
          }
        : null,
      clienteNombre: order.clienteNombre,
      clienteTelefono: order.clienteTelefono,
      direccionEntrega: order.direccionEntrega,
      estadoCumplimiento: order.estadoCumplimiento,
      estadoPago: order.estadoPago,
      subtotal: order.subtotal.toFixed(2),
      descuento: order.descuento.toFixed(2),
      impuesto: order.impuesto.toFixed(2),
      total: order.total.toFixed(2),
      moneda: {
        id: order.moneda.id,
        codigo: order.moneda.codigo,
        simbolo: order.moneda.simbolo,
      },
      tasaCambioAplicada: order.tasaCambioAplicada.toFixed(6),
      notas: order.notas,
      etaMinutos: order.etaMinutos,
      creadoPor: order.creadoPor,
      canceladoPor: order.canceladoPor,
      canceladoMotivo: order.canceladoMotivo,
      creadoEn: order.creadoEn,
      actualizadoEn: order.actualizadoEn,
      confirmadoEn: order.confirmadoEn,
      enPreparacionEn: order.enPreparacionEn,
      listoEn: order.listoEn,
      entregadoEn: order.entregadoEn,
      pagadoEn: order.pagadoEn,
      items: order.items.map((item) => ({
        id: item.id,
        productoId: item.productoId,
        productoNombre: item.productoNombre,
        cantidad: item.cantidad,
        precioUnitario: item.precioUnitario.toFixed(2),
        subtotal: item.subtotal.toFixed(2),
        notas: item.notas,
        estadoItem: item.estadoItem,
        orden: item.orden,
        enPreparacionEn: item.enPreparacionEn,
        listoEn: item.listoEn,
        modificadores: item.modificadores.map((modifier) => ({
          id: modifier.id,
          modificadorId: modifier.modificadorId,
          nombre: modifier.nombre,
          tipo: modifier.tipo,
          precioExtra: modifier.precioExtra.toFixed(2),
        })),
      })),
      pagos: order.pagos.map((pago) => ({
        id: pago.id,
        metodo: pago.metodo,
        estado: pago.estado,
        monto: pago.monto.toFixed(2),
      })),
    };
  }

  private mapPublicOrder(order: OrderWithRelations) {
    return {
      id: order.id,
      codigoPublico: order.codigoPublico,
      estadoCumplimiento: order.estadoCumplimiento,
      estadoPago: order.estadoPago,
      subtotal: order.subtotal.toFixed(2),
      descuento: order.descuento.toFixed(2),
      impuesto: order.impuesto.toFixed(2),
      total: order.total.toFixed(2),
      moneda: {
        codigo: order.moneda.codigo,
        simbolo: order.moneda.simbolo,
      },
      etaMinutos: order.etaMinutos,
      creadoEn: order.creadoEn,
      mesa: order.mesa
        ? { id: order.mesa.id, numero: order.mesa.numero }
        : null,
      items: order.items.map((item) => ({
        id: item.id,
        productoNombre: item.productoNombre,
        cantidad: item.cantidad,
        subtotal: item.subtotal.toFixed(2),
        notas: item.notas,
        estadoItem: item.estadoItem,
        modificadores: item.modificadores.map((modifier) => ({
          nombre: modifier.nombre,
          precioExtra: modifier.precioExtra.toFixed(2),
        })),
      })),
    };
  }

  private async writeOutbox(
    tx: Prisma.TransactionClient,
    order: OrderWithRelations,
    eventType: string,
    extra: Record<string, unknown> = {},
  ) {
    await tx.outboxEvent.create({
      data: {
        negocioId: order.negocioId,
        sucursalId: order.sucursalId,
        aggregateType: 'pedido',
        aggregateId: order.id,
        eventType,
        payload: this.auditPayload({
          pedidoId: order.id,
          codigoPublico: order.codigoPublico,
          estadoCumplimiento: order.estadoCumplimiento,
          estadoPago: order.estadoPago,
          total: order.total.toFixed(2),
          canal: order.canal,
          mesaId: order.mesaId,
          sucursalId: order.sucursalId,
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
