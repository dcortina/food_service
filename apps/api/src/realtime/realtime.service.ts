import { Injectable } from '@nestjs/common';
import { Server } from 'socket.io';
import { Prisma } from '../generated/prisma/client';

interface OrderEvent {
  id: string;
  sucursalId: string;
  codigoPublico: string;
  estadoCumplimiento: string;
  estadoPago: string;
  total: Prisma.Decimal;
  canal: string;
  mesaId: string | null;
  creadoEn: Date;
}

@Injectable()
export class RealtimeService {
  private server: Server | null = null;

  setServer(server: Server): void {
    this.server = server;
  }

  emitOrderCreated(order: OrderEvent): void {
    this.emitOrder('pedido.creado', order);
  }

  emitOrderUpdated(order: OrderEvent): void {
    this.emitOrder('pedido.actualizado', order);
  }

  emitItemUpdated(
    order: OrderEvent,
    itemId: string,
    estadoItem: string,
  ): void {
    this.emitToRooms(order, 'pedido.item.actualizado', {
      ...this.payload(order),
      itemId,
      estadoItem,
    });
  }

  private emitOrder(event: string, order: OrderEvent): void {
    this.emitToRooms(order, event, this.payload(order));
  }

  private payload(order: OrderEvent) {
    return {
      pedidoId: order.id,
      codigoPublico: order.codigoPublico,
      estadoCumplimiento: order.estadoCumplimiento,
      estadoPago: order.estadoPago,
      total: order.total.toFixed(2),
      canal: order.canal,
      mesaId: order.mesaId,
      creadoEn: order.creadoEn.toISOString(),
    };
  }

  private emitToRooms(
    order: OrderEvent,
    event: string,
    payload: unknown,
  ): void {
    this.server
      ?.to(`sucursal:${order.sucursalId}`)
      .emit(event, payload);
    this.server?.to(`kds:${order.sucursalId}`).emit(event, payload);
  }
}
