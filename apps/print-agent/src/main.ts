import 'dotenv/config';
import { CloudClient } from './cloud.client';
import { createServer } from './http-server';
import { PrinterService } from './printer.service';
import { QueueService } from './queue.service';
import { WorkerService } from './worker.service';

function bootstrap(): void {
  const queue = new QueueService();
  const printer = new PrinterService();
  const cloud = new CloudClient();
  const worker = new WorkerService(queue, printer, cloud);

  worker.start();
  cloud.startPolling(queue);

  const app = createServer(queue);
  const port = Number(process.env.PRINT_AGENT_PORT ?? 9100);

  app.listen(port, '0.0.0.0', () => {
    console.log(
      `Print agent listening on 0.0.0.0:${port} (mode: ${
        process.env.PRINTER_MODE ?? 'dry-run'
      })`,
    );
  });
}

bootstrap();
