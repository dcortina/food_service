import { QueueService } from './queue.service';

interface CloudJob {
  id: string;
  tipo: string;
  payload: unknown;
}

export class CloudClient {
  private readonly apiUrl = (
    process.env.CLOUD_API_URL ?? 'http://localhost:3000/api/v1'
  ).replace(/\/$/, '');
  private readonly token = process.env.PRINT_AGENT_TOKEN ?? '';
  private readonly negocioId =
    process.env.PRINT_AGENT_NEGOCIO_ID ?? '';
  private readonly sucursalId =
    process.env.PRINT_AGENT_SUCURSAL_ID ?? '';

  startPolling(queue: QueueService): void {
    const configured = Number(
      process.env.PRINT_AGENT_POLL_INTERVAL_MS ?? 5000,
    );
    const interval = Number.isFinite(configured)
      ? Math.max(configured, 1000)
      : 5000;

    setInterval(() => {
      void this.poll(queue);
    }, interval);

    void this.poll(queue);
  }

  async updateStatus(
    cloudId: string,
    estado: 'impreso' | 'fallido',
    error?: string,
  ): Promise<void> {
    if (!this.token) return;

    try {
      await fetch(
        `${this.apiUrl}/print/jobs/${cloudId}/status`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ estado, error }),
        },
      );
    } catch (error) {
      console.warn('Print agent status update failed', error);
    }
  }

  private async poll(queue: QueueService): Promise<void> {
    if (!this.token || !this.negocioId || !this.sucursalId) {
      return;
    }

    try {
      const url =
        `${this.apiUrl}/print/jobs/pending` +
        `?negocioId=${this.negocioId}` +
        `&sucursalId=${this.sucursalId}&limit=10`;

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${this.token}`,
        },
      });

      if (!response.ok) {
        console.warn(
          `Print agent poll failed: HTTP ${response.status}`,
        );
        return;
      }

      const jobs = (await response.json()) as CloudJob[];

      for (const job of jobs) {
        if (queue.hasCloudJob(job.id)) continue;

        queue.enqueue({
          source: 'cloud',
          cloudId: job.id,
          tipo: job.tipo,
          payload: job.payload,
        });
      }
    } catch (error) {
      console.warn('Print agent poll failed', error);
    }
  }
}
