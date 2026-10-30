import express, { RequestHandler } from 'express';
import { QueueService } from './queue.service';

export function createServer(queue: QueueService) {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  const token = process.env.PRINT_AGENT_TOKEN;

  const auth: RequestHandler = (request, response, next) => {
    if (!token) {
      response
        .status(500)
        .json({ error: 'PRINT_AGENT_TOKEN no está configurado' });
      return;
    }

    const header = request.headers.authorization;
    const value = header?.startsWith('Bearer ')
      ? header.slice(7)
      : undefined;

    if (value !== token) {
      response.status(401).json({ error: 'Unauthorized' });
      return;
    }

    next();
  };

  app.get('/health', (_request, response) => {
    response.json({
      status: 'ok',
      mode: process.env.PRINTER_MODE ?? 'dry-run',
    });
  });

  app.use(auth);

  app.post('/print', (request, response) => {
    const body = request.body as {
      tipo?: string;
      payload?: unknown;
    };

    if (!body.tipo || !['comanda', 'ticket'].includes(body.tipo)) {
      response.status(400).json({ error: 'tipo inválido' });
      return;
    }

    const job = queue.enqueue({
      source: 'lan',
      cloudId: null,
      tipo: body.tipo,
      payload: body.payload ?? {},
    });

    response.status(202).json({
      id: job.id,
      status: job.status,
    });
  });

  app.get('/jobs', (_request, response) => {
    response.json(queue.list(50));
  });

  return app;
}
