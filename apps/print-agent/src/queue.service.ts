import Database from 'better-sqlite3';
import { randomUUID } from 'node:crypto';

export interface QueueJob {
  id: string;
  source: string;
  cloudId: string | null;
  tipo: string;
  payload: unknown;
  status: string;
  attempts: number;
  error: string | null;
  createdAt: string;
  availableAt: string;
}

interface QueueRow {
  id: string;
  source: string;
  cloud_id: string | null;
  tipo: string;
  payload: string;
  status: string;
  attempts: number;
  error: string | null;
  created_at: string;
  available_at: string;
}

export class QueueService {
  private readonly db: Database.Database;

  constructor() {
    const path = process.env.PRINT_AGENT_DB ?? './print-agent.sqlite';
    this.db = new Database(path);
    this.db.pragma('journal_mode = WAL');
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS print_jobs (
        id TEXT PRIMARY KEY,
        source TEXT NOT NULL,
        cloud_id TEXT,
        tipo TEXT NOT NULL,
        payload TEXT NOT NULL,
        status TEXT NOT NULL,
        attempts INTEGER NOT NULL DEFAULT 0,
        error TEXT,
        created_at TEXT NOT NULL,
        available_at TEXT NOT NULL,
        printed_at TEXT
      );
    `);
  }

  enqueue(input: {
    source: string;
    cloudId: string | null;
    tipo: string;
    payload: unknown;
  }): QueueJob {
    const id = randomUUID();
    const now = new Date().toISOString();

    this.db
      .prepare(
        `INSERT INTO print_jobs
          (id, source, cloud_id, tipo, payload, status, attempts, created_at, available_at)
         VALUES (?, ?, ?, ?, ?, 'pendiente', 0, ?, ?)`,
      )
      .run(
        id,
        input.source,
        input.cloudId,
        input.tipo,
        JSON.stringify(input.payload),
        now,
        now,
      );

    return this.get(id) as QueueJob;
  }

  hasCloudJob(cloudId: string): boolean {
    const row = this.db
      .prepare('SELECT 1 FROM print_jobs WHERE cloud_id = ? LIMIT 1')
      .get(cloudId);

    return Boolean(row);
  }

  nextPending(): QueueJob | null {
    const row = this.db
      .prepare(
        `SELECT * FROM print_jobs
         WHERE status = 'pendiente' AND available_at <= ?
         ORDER BY created_at
         LIMIT 1`,
      )
      .get(new Date().toISOString()) as QueueRow | undefined;

    return row ? this.map(row) : null;
  }

  markPrinted(id: string): void {
    this.db
      .prepare(
        `UPDATE print_jobs
         SET status = 'impreso', printed_at = ?, error = NULL
         WHERE id = ?`,
      )
      .run(new Date().toISOString(), id);
  }

  markFailed(
    id: string,
    error: string,
  ): { status: string; attempts: number } {
    const job = this.get(id);
    if (!job) return { status: 'fallido', attempts: 0 };

    const attempts = job.attempts + 1;

    if (attempts >= 3) {
      this.db
        .prepare(
          `UPDATE print_jobs
           SET status = 'fallido', attempts = ?, error = ?, printed_at = NULL
           WHERE id = ?`,
        )
        .run(attempts, error, id);

      return { status: 'fallido', attempts };
    }

    const availableAt = new Date(
      Date.now() + 30_000,
    ).toISOString();

    this.db
      .prepare(
        `UPDATE print_jobs
         SET status = 'pendiente', attempts = ?, error = ?, available_at = ?
         WHERE id = ?`,
      )
      .run(attempts, error, availableAt, id);

    return { status: 'pendiente', attempts };
  }

  list(limit: number): QueueJob[] {
    const rows = this.db
      .prepare(
        'SELECT * FROM print_jobs ORDER BY created_at DESC LIMIT ?',
      )
      .all(limit) as QueueRow[];

    return rows.map((row) => this.map(row));
  }

  private get(id: string): QueueJob | null {
    const row = this.db
      .prepare('SELECT * FROM print_jobs WHERE id = ?')
      .get(id) as QueueRow | undefined;

    return row ? this.map(row) : null;
  }

  private map(row: QueueRow): QueueJob {
    return {
      id: row.id,
      source: row.source,
      cloudId: row.cloud_id,
      tipo: row.tipo,
      payload: JSON.parse(row.payload),
      status: row.status,
      attempts: row.attempts,
      error: row.error,
      createdAt: row.created_at,
      availableAt: row.available_at,
    };
  }
}
