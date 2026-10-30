import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { CashService } from '../cash/cash.service';
import { Prisma } from '../generated/prisma/client';
import { BusinessDayService } from '../orders/business-day.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  ReportRangeQueryDto,
  SalesReportQueryDto,
} from './dto/report-query.dto';

const orderInclude = {
  items: true,
  pagos: {
    include: {
      creadoPor: {
        select: { id: true, nombre: true, username: true },
      },
    },
  },
  creadoPor: {
    select: { id: true, nombre: true, username: true },
  },
  mesa: { select: { id: true, numero: true } },
  asignaciones: {
    include: {
      repartidor: {
        include: {
          usuario: { select: { id: true, nombre: true } },
        },
      },
    },
  },
} satisfies Prisma.PedidoInclude;

type ReportOrder = Prisma.PedidoGetPayload<{
  include: typeof orderInclude;
}>;

interface ResolvedRange {
  desde: Date;
  hasta: Date;
  desdeString: string;
  hastaString: string;
  timeZone: string;
}

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly businessDay: BusinessDayService,
    private readonly cashService: CashService,
  ) {}

  async getDashboard(
    query: ReportRangeQueryDto,
    current: AuthenticatedUser,
  ) {
    const range = await this.resolveRange(query, current);
    const orders = await this.loadOrders(range, current);
    const data = this.buildSalesData(orders, range, 10);

    const activeOrders = orders.filter((order) =>
      ['nuevo', 'confirmado', 'en_preparacion', 'listo'].includes(
        order.estadoCumplimiento,
      ),
    ).length;

    const openShift = await this.prisma.turnoCaja.findFirst({
      where: {
        negocioId: current.negocioId,
        sucursalId: current.sucursalId,
        estado: 'abierto',
      },
      include: {
        cajero: { select: { nombre: true } },
      },
    });

    return {
      rango: {
        desde: range.desdeString,
        hasta: range.hastaString,
      },
      resumen: {
        ventasTotales: data.ventasTotales,
        pedidosPagados: data.pedidosPagados,
        ticketPromedio: data.ticketPromedio,
        pedidosActivos: activeOrders,
      },
      ventasPorCanal: data.ventasPorCanal,
      ventasPorMetodo: data.ventasPorMetodo,
      ventasPorHora: data.ventasPorHora,
      productosTop: data.productosTop,
      ventasPorCajero: data.ventasPorCajero,
      ventasPorRepartidor: data.ventasPorRepartidor,
      cajaAbierta: openShift
        ? {
            id: openShift.id,
            cajero: openShift.cajero.nombre,
            fondoInicial: openShift.fondoInicial.toFixed(2),
            abiertoEn: openShift.abiertoEn,
          }
        : null,
      ultimosPedidos: orders.slice(0, 5).map((order) => ({
        id: order.id,
        codigoPublico: order.codigoPublico,
        canal: order.canal,
        estadoCumplimiento: order.estadoCumplimiento,
        estadoPago: order.estadoPago,
        total: order.total.toFixed(2),
        mesa: order.mesa?.numero ?? null,
        creadoEn: order.creadoEn,
      })),
    };
  }

  async getSalesByChannel(
    query: ReportRangeQueryDto,
    current: AuthenticatedUser,
  ) {
    const range = await this.resolveRange(query, current);
    const orders = await this.loadOrders(range, current);

    return this.buildSalesData(orders, range, 10).ventasPorCanal;
  }

  async getTopProducts(
    query: SalesReportQueryDto,
    current: AuthenticatedUser,
  ) {
    const range = await this.resolveRange(query, current);
    const orders = await this.loadOrders(range, current);

    return this.buildSalesData(
      orders,
      range,
      query.limit ?? 10,
    ).productosTop;
  }

  async getSalesByCashier(
    query: ReportRangeQueryDto,
    current: AuthenticatedUser,
  ) {
    const range = await this.resolveRange(query, current);
    const orders = await this.loadOrders(range, current);

    return this.buildSalesData(orders, range, 10).ventasPorCajero;
  }

  async getSalesByCourier(
    query: ReportRangeQueryDto,
    current: AuthenticatedUser,
  ) {
    const range = await this.resolveRange(query, current);
    const orders = await this.loadOrders(range, current);

    return this.buildSalesData(orders, range, 10).ventasPorRepartidor;
  }

  async getCashClose(turnoId: string, current: AuthenticatedUser) {
    const shift = await this.cashService.findShift(turnoId, current);

    const cashPayments = shift.pagos.filter(
      (pago) =>
        pago.metodo === 'efectivo' &&
        (pago.estado === 'verificado' || pago.estado === 'conciliado'),
    );
    const cashTotal = cashPayments.reduce(
      (sum, pago) => sum.plus(new Prisma.Decimal(pago.monto)),
      new Prisma.Decimal(0),
    );

    const electronicPayments = shift.pagos.filter(
      (pago) =>
        (pago.metodo === 'transfermovil' || pago.metodo === 'enzona') &&
        (pago.estado === 'registrado' ||
          pago.estado === 'verificado' ||
          pago.estado === 'conciliado'),
    );
    const electronicTotal = electronicPayments.reduce(
      (sum, pago) => sum.plus(new Prisma.Decimal(pago.monto)),
      new Prisma.Decimal(0),
    );

    const movementTotal = shift.movimientos.reduce(
      (sum, movement) =>
        sum.plus(new Prisma.Decimal(movement.monto)),
      new Prisma.Decimal(0),
    );

    return {
      turno: shift,
      resumen: {
        fondoInicial: shift.fondoInicial,
        efectivoEsperado: shift.efectivoEsperado,
        efectivoContado: shift.efectivoContado,
        descuadre: shift.descuadre,
        totalElectronicoReportado: shift.totalElectronicoReportado,
        totalElectronicoConciliado: shift.totalElectronicoConciliado,
        pagosEfectivo: cashTotal.toFixed(2),
        pagosElectronicos: electronicTotal.toFixed(2),
        totalPagos: cashTotal.plus(electronicTotal).toFixed(2),
        movimientos: movementTotal.toFixed(2),
      },
    };
  }

  async exportSalesCsv(
    query: ReportRangeQueryDto,
    current: AuthenticatedUser,
  ) {
    const range = await this.resolveRange(query, current);
    const orders = await this.loadOrders(range, current);
    const paidOrders = orders.filter(
      (order) => order.estadoPago === 'pagado',
    );

    const headers = [
      'codigo_publico',
      'fecha_operativa',
      'canal',
      'mesa',
      'cliente',
      'telefono',
      'estado_pago',
      'subtotal',
      'descuento',
      'impuesto',
      'total',
      'metodos_pago',
    ];

    const rows = paidOrders.map((order) => [
      order.codigoPublico,
      order.fechaOperativa.toISOString().slice(0, 10),
      order.canal,
      order.mesa?.numero ?? '',
      order.clienteNombre ?? '',
      order.clienteTelefono ?? '',
      order.estadoPago,
      order.subtotal.toFixed(2),
      order.descuento.toFixed(2),
      order.impuesto.toFixed(2),
      order.total.toFixed(2),
      [
        ...new Set(
          order.pagos
            .filter((pago) => pago.estado !== 'anulado')
            .map((pago) => pago.metodo),
        ),
      ].join('|'),
    ]);

    return {
      filename: `ventas-${range.desdeString}-${range.hastaString}.csv`,
      content: this.toCsv(headers, rows),
    };
  }

  async exportCashCloseCsv(
    turnoId: string,
    current: AuthenticatedUser,
  ) {
    const report = await this.getCashClose(turnoId, current);
    const shift = report.turno;

    const headers = [
      'tipo',
      'referencia',
      'metodo',
      'monto',
      'estado',
      'fecha',
    ];

    const rows: unknown[][] = [];

    for (const pago of shift.pagos) {
      rows.push([
        'pago',
        pago.pedido?.codigoPublico ?? '',
        pago.metodo,
        pago.monto,
        pago.estado,
        this.toIsoDate(pago.creadoEn),
      ]);
    }

    for (const movement of shift.movimientos) {
      rows.push([
        'movimiento',
        movement.motivo,
        movement.tipo,
        movement.monto,
        '',
        this.toIsoDate(movement.creadoEn),
      ]);
    }

    return {
      filename: `cierre-${turnoId}.csv`,
      content: this.toCsv(headers, rows),
    };
  }

  private async resolveRange(
    query: ReportRangeQueryDto,
    current: AuthenticatedUser,
  ): Promise<ResolvedRange> {
    const negocio = await this.prisma.negocio.findFirst({
      where: { id: current.negocioId, activo: true },
      select: { zonaHoraria: true, corteDiaHora: true },
    });

    if (!negocio) {
      throw new NotFoundException('Negocio no encontrado');
    }

    const today = this.businessDay.getBusinessDay(negocio);
    const desdeString = query.desde ?? today.dateString;
    const hastaString = query.hasta ?? today.dateString;
    const desde = new Date(`${desdeString}T00:00:00.000Z`);
    const hasta = new Date(`${hastaString}T00:00:00.000Z`);

    if (
      Number.isNaN(desde.getTime()) ||
      Number.isNaN(hasta.getTime()) ||
      desde > hasta
    ) {
      throw new BadRequestException('Rango de fechas inválido');
    }

    const days =
      Math.floor(
        (hasta.getTime() - desde.getTime()) / 86_400_000,
      ) + 1;

    if (days > 366) {
      throw new BadRequestException(
        'El rango no puede superar 366 días',
      );
    }

    return {
      desde,
      hasta,
      desdeString,
      hastaString,
      timeZone: negocio.zonaHoraria,
    };
  }

  private loadOrders(
    range: ResolvedRange,
    current: AuthenticatedUser,
  ): Promise<ReportOrder[]> {
    return this.prisma.pedido.findMany({
      where: {
        negocioId: current.negocioId,
        sucursalId: current.sucursalId,
        fechaOperativa: {
          gte: range.desde,
          lte: range.hasta,
        },
      },
      include: orderInclude,
      orderBy: { creadoEn: 'desc' },
    });
  }

  private buildSalesData(
    orders: ReportOrder[],
    range: ResolvedRange,
    limit: number,
  ) {
    const paidOrders = orders.filter(
      (order) => order.estadoPago === 'pagado',
    );
    const payments = paidOrders
      .flatMap((order) => order.pagos)
      .filter(
        (pago) =>
          pago.estado === 'verificado' ||
          pago.estado === 'conciliado',
      );

    const totalSales = paidOrders.reduce(
      (sum, order) => sum.plus(order.total),
      new Prisma.Decimal(0),
    );
    const ticketPromedio = paidOrders.length
      ? totalSales.div(paidOrders.length)
      : new Prisma.Decimal(0);

    const channelMap = new Map<
      string,
      { canal: string; pedidos: number; total: Prisma.Decimal }
    >();
    for (const order of paidOrders) {
      const entry = channelMap.get(order.canal) ?? {
        canal: order.canal,
        pedidos: 0,
        total: new Prisma.Decimal(0),
      };
      entry.pedidos += 1;
      entry.total = entry.total.plus(order.total);
      channelMap.set(order.canal, entry);
    }
    const ventasPorCanal = [...channelMap.values()]
      .sort((a, b) => b.total.comparedTo(a.total))
      .map((entry) => ({
        canal: entry.canal,
        pedidos: entry.pedidos,
        total: entry.total.toFixed(2),
      }));

    const methodMap = new Map<
      string,
      { metodo: string; pagos: number; total: Prisma.Decimal }
    >();
    for (const payment of payments) {
      const entry = methodMap.get(payment.metodo) ?? {
        metodo: payment.metodo,
        pagos: 0,
        total: new Prisma.Decimal(0),
      };
      entry.pagos += 1;
      entry.total = entry.total.plus(payment.monto);
      methodMap.set(payment.metodo, entry);
    }
    const ventasPorMetodo = [...methodMap.values()]
      .sort((a, b) => b.total.comparedTo(a.total))
      .map((entry) => ({
        metodo: entry.metodo,
        pagos: entry.pagos,
        total: entry.total.toFixed(2),
      }));

    const hourMap = new Map<
      number,
      { hora: number; pedidos: number; total: Prisma.Decimal }
    >();
    for (const order of paidOrders) {
      const date = order.pagadoEn ?? order.creadoEn;
      const hour = this.hourInTimeZone(date, range.timeZone);
      const entry = hourMap.get(hour) ?? {
        hora: hour,
        pedidos: 0,
        total: new Prisma.Decimal(0),
      };
      entry.pedidos += 1;
      entry.total = entry.total.plus(order.total);
      hourMap.set(hour, entry);
    }
    const ventasPorHora = [...hourMap.values()]
      .sort((a, b) => a.hora - b.hora)
      .map((entry) => ({
        hora: entry.hora,
        pedidos: entry.pedidos,
        total: entry.total.toFixed(2),
      }));

    const productMap = new Map<
      string,
      { producto: string; cantidad: number; total: Prisma.Decimal }
    >();
    for (const order of paidOrders) {
      for (const item of order.items) {
        const entry = productMap.get(item.productoNombre) ?? {
          producto: item.productoNombre,
          cantidad: 0,
          total: new Prisma.Decimal(0),
        };
        entry.cantidad += item.cantidad;
        entry.total = entry.total.plus(item.subtotal);
        productMap.set(item.productoNombre, entry);
      }
    }
    const productosTop = [...productMap.values()]
      .sort(
        (a, b) =>
          b.cantidad - a.cantidad ||
          b.total.comparedTo(a.total),
      )
      .slice(0, limit)
      .map((entry) => ({
        producto: entry.producto,
        cantidad: entry.cantidad,
        total: entry.total.toFixed(2),
      }));

    const cashierMap = new Map<
      string,
      { usuario: string; pagos: number; total: Prisma.Decimal }
    >();
    for (const payment of payments) {
      const name = payment.creadoPor?.nombre ?? 'Sistema';
      const entry = cashierMap.get(name) ?? {
        usuario: name,
        pagos: 0,
        total: new Prisma.Decimal(0),
      };
      entry.pagos += 1;
      entry.total = entry.total.plus(payment.monto);
      cashierMap.set(name, entry);
    }
    const ventasPorCajero = [...cashierMap.values()]
      .sort((a, b) => b.total.comparedTo(a.total))
      .map((entry) => ({
        usuario: entry.usuario,
        pagos: entry.pagos,
        total: entry.total.toFixed(2),
      }));

    const courierMap = new Map<
      string,
      { repartidor: string; pedidos: number; total: Prisma.Decimal }
    >();
    for (const order of paidOrders) {
      const assignment = order.asignaciones[0];
      if (!assignment) continue;

      const name = assignment.repartidor.usuario.nombre;
      const entry = courierMap.get(name) ?? {
        repartidor: name,
        pedidos: 0,
        total: new Prisma.Decimal(0),
      };
      entry.pedidos += 1;
      entry.total = entry.total.plus(order.total);
      courierMap.set(name, entry);
    }
    const ventasPorRepartidor = [...courierMap.values()]
      .sort((a, b) => b.total.comparedTo(a.total))
      .map((entry) => ({
        repartidor: entry.repartidor,
        pedidos: entry.pedidos,
        total: entry.total.toFixed(2),
      }));

    return {
      ventasTotales: totalSales.toFixed(2),
      pedidosPagados: paidOrders.length,
      ticketPromedio: ticketPromedio.toFixed(2),
      ventasPorCanal,
      ventasPorMetodo,
      ventasPorHora,
      productosTop,
      ventasPorCajero,
      ventasPorRepartidor,
    };
  }

  private hourInTimeZone(date: Date, timeZone: string): number {
    const hour = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      hour: '2-digit',
      hourCycle: 'h23',
    }).format(date);

    return Number(hour);
  }

  private toIsoDate(value: Date | string): string {
    return value instanceof Date ? value.toISOString() : String(value);
  }

  private toCsv(headers: string[], rows: unknown[][]): string {
    const escape = (value: unknown) =>
      `"${String(value ?? '').replace(/"/g, '""')}"`;

    return [headers, ...rows]
      .map((row) => row.map(escape).join(','))
      .join('\n');
  }
}
