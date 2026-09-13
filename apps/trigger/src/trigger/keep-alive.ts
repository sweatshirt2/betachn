import { logger, schedules } from '@trigger.dev/sdk';

/**
 * External keep-alive heartbeat for the Render-hosted worker (D100).
 *
 * Render's free tier spins the service down after 15 minutes without inbound
 * traffic, and pg-boss cron ticks skip entirely while the process is stopped
 * (no catch-up on wake — D99). A single wake warms the worker for ~15 minutes,
 * so one schedule anchors the whole system: every 4th hour at :50 (UTC) —
 * pings at 03:50 / 07:50 / 11:50 / 15:50 / 19:50 / 23:50, giving six
 * 15-minute windows that cover every worker cron minute:
 *
 *   03:50 window → 04:00 generate-occurrences + prune-changes
 *                  + 07:00 Africa/Addis_Ababa (= 04:00 UTC) due-today digest
 *   15:50 window → 16:00 UTC backup-nudge (19:00 Addis, Sundays)
 *   every window → hourly sweep-missed ticks that land inside it
 *
 * Sweeps between wakes are state-based (first tick converts everything
 * pending-past-due), so missed-chore notifications may lag up to ~4h —
 * inside the day-scale grace windows (§4.9).
 *
 * The fetch allows 90s so the ping itself absorbs a cold start if one ever
 * happens; a non-2xx response throws so the configured retries apply.
 */
export const pingWorker = schedules.task({
  id: 'ping-worker',
  maxDuration: 120,
  retry: {
    maxAttempts: 2,
    minTimeoutInMs: 1_000,
    maxTimeoutInMs: 10_000,
    factor: 2,
    randomize: true,
  },
  run: async ({ timestamp }) => {
    const baseUrl = process.env.WORKER_HEALTH_URL;
    if (!baseUrl) {
      throw new Error('WORKER_HEALTH_URL is not set — configure it in the Trigger.dev dashboard.');
    }

    const url = `${baseUrl.replace(/\/+$/, '')}/health`;
    const response = await fetch(url, {
      signal: AbortSignal.timeout(90_000),
      headers: { accept: 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`worker health check failed: ${response.status} ${response.statusText}`);
    }

    const body = (await response.json()) as { data?: { ok?: boolean; uptimeSeconds?: number } };
    if (!body.data?.ok) {
      throw new Error(`worker health check returned unexpected body: ${JSON.stringify(body)}`);
    }

    logger.log('worker is awake', {
      scheduledFor: timestamp.toISOString(),
      uptimeSeconds: body.data.uptimeSeconds,
    });
    return { url, uptimeSeconds: body.data.uptimeSeconds ?? null };
  },
});
