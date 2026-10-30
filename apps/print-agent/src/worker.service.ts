import { CloudClient } from './cloud.client';
import { PrintPayload, PrinterService } from './printer.service';
import { QueueService } from './queue.service';

export class WorkerService {
  private running = false;

  constructor(
    private readonly queue: QueueService,
    private readonly printer: PrinterService,
    private readonly cloud: CloudClient,
  ) {}

  start(): void {
    setInterval(() => {
      void this.tick();
    }, 1000);

    void this.tick();
  }

  private async tick(): Promise<void> {
    if (this.running) return;

    const job = this.queue.nextPending();
    if (!job) return;

    this.running = true;

    try {
      await this.printer.print(
        job.tipo,
        job.payload as PrintPayload,
      );
      this.queue.markPrinted(job.id);

      if (job.cloudId) {
        await this.cloud.updateStatus(job.cloudId, 'impreso');
      }

      console.log(
        `Print job ${job.id} (${job.tipo}) printed from ${job.source}`,
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : String(error);
      const result = this.queue.markFailed(job.id, message);

      if (job.cloudId && result.status === 'fallido') {
        await this.cloud.updateStatus(
          job.cloudId,
          'fallido',
          message,
        );
      }

      console.warn(`Print job ${job.id} failed: ${message}`);
    } finally {
      this.running = false;
    }
  }
}
