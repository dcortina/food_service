import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface CreatePrintJobInput {
  negocioId: string;
  sucursalId: string;
  pedidoId?: string | null;
  tipo: 'comanda' | 'ticket';
  payload: Prisma.InputJsonValue;
}

@Injectable()
export class PrintService {
  constructor(private readonly prisma: PrismaService) {}

  async createJob(input: CreatePrintJobInput) {
    const job = await this.prisma.printJob.create({
      data: {
        negocioId: input.negocioId,
        sucursalId: input.sucursalId,
        pedidoId: input.pedidoId ?? null,
        tipo: input.tipo,
        payload: input.payload,
        estado: 'pendiente',
      },
    });

    return this.mapJob(job);
  }

  async listPending(
    negocioId: string,
    sucursalId: string,
    limit = 20,
  ) {
    const jobs = await this.prisma.printJob.findMany({
      where: {
        negocioId,
        sucursalId,
        estado: 'pendiente',
      },
      orderBy: { creadoEn: 'asc' },
      take: limit,
    });

    return jobs.map((job) => this.mapJob(job));
  }

  async updateStatus(
    id: string,
    estado: 'impreso' | 'fallido',
    error?: string,
  ) {
    const job = await this.prisma.printJob.findUnique({
      where: { id },
    });

    if (!job) {
      throw new NotFoundException(
        'Trabajo de impresión no encontrado',
      );
    }

    const updated = await this.prisma.printJob.update({
      where: { id },
      data: {
        estado,
        impresoEn: estado === 'impreso' ? new Date() : null,
        intentos: { increment: 1 },
        ultimoError: error ?? null,
      },
    });

    return this.mapJob(updated);
  }

  private mapJob(job: {
    id: string;
    negocioId: string;
    sucursalId: string;
    pedidoId: string | null;
    tipo: string;
    payload: Prisma.JsonValue;
    estado: string;
    intentos: number;
    ultimoError: string | null;
    creadoEn: Date;
    impresoEn: Date | null;
  }) {
    return {
      id: job.id,
      negocioId: job.negocioId,
      sucursalId: job.sucursalId,
      pedidoId: job.pedidoId,
      tipo: job.tipo,
      payload: job.payload,
      estado: job.estado,
      intentos: job.intentos,
      ultimoError: job.ultimoError,
      creadoEn: job.creadoEn,
      impresoEn: job.impresoEn,
    };
  }
}
