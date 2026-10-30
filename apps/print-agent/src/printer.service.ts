import * as iconv from 'iconv-lite';
import * as net from 'node:net';

export interface PrintPayload {
  codigoPublico?: string;
  negocio?: { nombre?: string };
  sucursal?: { nombre?: string };
  mesa?: { numero?: string };
  canal?: string;
  creadoEn?: string;
  items?: Array<{
    cantidad: number;
    productoNombre: string;
    subtotal: string;
    notas?: string | null;
    modificadores?: Array<{
      nombre: string;
      precioExtra: string;
    }>;
  }>;
  subtotal?: string;
  descuento?: string;
  impuesto?: string;
  total?: string;
  moneda?: { codigo?: string; simbolo?: string };
  pagos?: Array<{ metodo: string; monto: string }>;
  notas?: string | null;
}

export class PrinterService {
  private readonly mode = process.env.PRINTER_MODE ?? 'dry-run';
  private readonly width =
    Number(process.env.PRINTER_WIDTH ?? 80) === 58 ? 32 : 48;

  async print(tipo: string, payload: PrintPayload): Promise<void> {
    const text =
      tipo === 'comanda'
        ? this.formatComanda(payload)
        : this.formatTicket(payload);

    if (this.mode === 'dry-run') {
      console.log(`\n--- ${tipo.toUpperCase()} (dry-run) ---`);
      console.log(text);
      console.log('--- end ---\n');
      return;
    }

    if (this.mode === 'network') {
      await this.sendNetwork(
        this.buildEscPos(text, tipo === 'ticket'),
      );
      return;
    }

    throw new Error(`PRINTER_MODE no soportado: ${this.mode}`);
  }

  private formatComanda(payload: PrintPayload): string {
    const lines: string[] = [];
    const line = '-'.repeat(this.width);

    lines.push(this.center(payload.negocio?.nombre ?? 'CafeQR'));
    lines.push(
      this.center(`COMANDA ${payload.codigoPublico ?? ''}`),
    );
    lines.push(
      `Mesa: ${payload.mesa?.numero ?? 'N/A'}  Canal: ${payload.canal ?? ''}`,
    );
    lines.push(`Fecha: ${this.formatDate(payload.creadoEn)}`);
    lines.push(line);

    for (const item of payload.items ?? []) {
      const left = `${item.cantidad}x ${item.productoNombre}`;
      const right = item.subtotal;
      const space = Math.max(1, this.width - left.length - right.length);
      lines.push(`${left}${' '.repeat(space)}${right}`);

      for (const modifier of item.modificadores ?? []) {
        lines.push(`  + ${modifier.nombre}`);
      }

      if (item.notas) {
        lines.push(`  Nota: ${item.notas}`);
      }
    }

    lines.push(line);

    if (payload.notas) {
      lines.push(`Nota general: ${payload.notas}`);
    }

    lines.push(`Total: ${payload.total ?? ''}`);
    lines.push(line);

    return lines.join('\n');
  }

  private formatTicket(payload: PrintPayload): string {
    const lines: string[] = [];
    const line = '-'.repeat(this.width);

    lines.push(this.center(payload.negocio?.nombre ?? 'CafeQR'));
    lines.push(
      this.center(`TICKET ${payload.codigoPublico ?? ''}`),
    );
    lines.push(
      `Mesa: ${payload.mesa?.numero ?? 'N/A'}  ${payload.sucursal?.nombre ?? ''}`,
    );
    lines.push(`Fecha: ${this.formatDate(payload.creadoEn)}`);
    lines.push(line);

    for (const item of payload.items ?? []) {
      const left = `${item.cantidad}x ${item.productoNombre}`;
      const right = item.subtotal;
      const space = Math.max(1, this.width - left.length - right.length);
      lines.push(`${left}${' '.repeat(space)}${right}`);

      for (const modifier of item.modificadores ?? []) {
        lines.push(
          `  + ${modifier.nombre} ${modifier.precioExtra}`,
        );
      }

      if (item.notas) {
        lines.push(`  Nota: ${item.notas}`);
      }
    }

    lines.push(line);
    lines.push(this.row('Subtotal', payload.subtotal));
    lines.push(this.row('Descuento', payload.descuento));
    lines.push(this.row('Impuesto', payload.impuesto));
    lines.push(this.row('TOTAL', payload.total));
    lines.push(line);

    for (const pago of payload.pagos ?? []) {
      lines.push(this.row(`Pago ${pago.metodo}`, pago.monto));
    }

    lines.push(this.center('¡Gracias por su compra!'));
    lines.push(line);

    return lines.join('\n');
  }

  private buildEscPos(text: string, openDrawer: boolean): Buffer {
    const chunks: Buffer[] = [Buffer.from([0x1b, 0x40])];

    chunks.push(iconv.encode(text, 'CP850'));

    if (openDrawer) {
      chunks.push(Buffer.from([0x1b, 0x70, 0x00, 0x19, 0xfa]));
    }

    chunks.push(Buffer.from([0x1d, 0x56, 0x42, 0x00]));

    return Buffer.concat(chunks);
  }

  private sendNetwork(buffer: Buffer): Promise<void> {
    return new Promise((resolve, reject) => {
      const host = process.env.PRINTER_HOST;
      const port = Number(process.env.PRINTER_PORT ?? 9100);

      if (!host) {
        reject(new Error('PRINTER_HOST no está configurado'));
        return;
      }

      const socket = net.createConnection({ host, port }, () => {
        socket.write(buffer);
        socket.end();
      });

      socket.on('close', () => resolve());
      socket.on('error', reject);
      socket.setTimeout(5_000, () => {
        socket.destroy();
        reject(new Error('Timeout de impresora'));
      });
    });
  }

  private center(text: string): string {
    const padding = Math.max(
      0,
      Math.floor((this.width - text.length) / 2),
    );

    return `${' '.repeat(padding)}${text}`;
  }

  private row(label: string, value?: string): string {
    const right = value ?? '';
    const space = Math.max(
      1,
      this.width - label.length - right.length,
    );

    return `${label}${' '.repeat(space)}${right}`;
  }

  private formatDate(value?: string): string {
    if (!value) return '';

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';

    return date.toLocaleString('es-CU');
  }
}
