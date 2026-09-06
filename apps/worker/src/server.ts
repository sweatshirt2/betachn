import express from 'express';
import PgBoss from 'pg-boss';
import { desc } from 'drizzle-orm';
import { db, jobsAudit, pool } from '@chorify/db';
import { readWorkerEnv } from './env';
import { requireAdminToken } from './adminAuth';
import { jobRegistry, registerJobs } from './jobs';

const env = readWorkerEnv();

async function main(): Promise<void> {
  const boss = new PgBoss({ connectionString: env.DATABASE_URL });
  boss.on('error', (err) => console.error('pg-boss error:', err));
  await boss.start();
  await registerJobs(boss);

  const app = express();
  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.json({ data: { ok: true, uptimeSeconds: Math.round(process.uptime()) } });
  });

  app.get('/admin/jobs', requireAdminToken(env), async (_req, res) => {
    const runs = await db.select().from(jobsAudit).orderBy(desc(jobsAudit.ranAt)).limit(100);
    res.json({ data: { runs } });
  });

  app.post('/admin/jobs/:name/run', requireAdminToken(env), async (req, res) => {
    const { name } = req.params;
    if (typeof name !== 'string') {
      res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Missing job name' },
      });
      return;
    }
    const handler = jobRegistry[name];
    if (!handler) {
      res.status(404).json({
        error: { code: 'NOT_FOUND', message: `Unknown job: ${name}` },
      });
      return;
    }
    try {
      const result = await handler();
      await db.insert(jobsAudit).values({ name, result: result ?? {} });
      res.json({ data: result });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await db.insert(jobsAudit).values({ name, result: { error: message } });
      res.status(500).json({ error: { code: 'CONFLICT', message } });
    }
  });

  const server = app.listen(env.PORT, () => {
    console.log(`worker listening on :${env.PORT}`);
  });

  const shutdown = async (): Promise<void> => {
    server.close();
    await boss.stop();
    await pool.end();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  console.error('worker boot failed:', err);
  process.exit(1);
});
