import type { Executor } from '@chorify/db';

/**
 * Force-runnable job handlers. Jobs register here as they land
 * (generate-occurrences, sweep-missed, due-today-reminders, backup-nudge).
 */
export type JobHandler = (executor: Executor) => Promise<Record<string, unknown>>;

export const jobRegistry: Record<string, JobHandler> = {};
