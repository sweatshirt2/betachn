import { and, desc, eq, isNull, lt } from 'drizzle-orm';
import { activityEvents, notificationPrefs, notifications } from '@chorify/db';
import { AppError } from '../../errors';
import type { Clock } from '../../ports';
import type { ActivityDomain } from '../../activity';
import type { UnitOfWork } from '../../db';
import {
  activityEventRowSchema,
  notificationPrefsRowSchema,
  notificationRowSchema,
  type ActivityEventRecord,
  type NotificationPrefsRecord,
  type NotificationRecord,
  type PutNotificationPrefsInput,
} from './social.schema';

/** Filters for the story feed — applied in JS after the range fetch. */
export interface ActivityFilters {
  actorPersonId?: string;
  actionType?: string;
  /** Matches `payload.title` snapshots (responsibility/chore title). */
  responsibilityTitle?: string;
  /** Inclusive lower bound, YYYY-MM-DD (local-free ISO day compare). */
  fromDate?: string;
  /** Inclusive upper bound, YYYY-MM-DD. */
  toDate?: string;
  limit?: number;
  cursor?: string;
}

export interface ActivityPage {
  events: ActivityEventRecord[];
  nextCursor: string | null;
}

const isoDay = (date: Date): string => date.toISOString().slice(0, 10);

/**
 * Notifications inbox + per-person category prefs + household activity feed.
 * jsonb-shaped filters (member, chore, from/to) are applied in JS after a
 * cursor-range fetch — dialect-neutral by convention; only the range narrows
 * in SQL.
 */
export class SocialService {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly clock: Clock,
  ) {}

  /** Newest first, recipient-scoped. unreadOnly filters after parse (JS). */
  async listNotifications(
    personId: string,
    opts: { unreadOnly?: boolean; limit?: number } = {},
  ): Promise<NotificationRecord[]> {
    const rows = await this.uow.exec.query.notifications!.findMany({
      where: eq(notifications.recipientPersonId, personId),
      orderBy: [desc(notifications.createdAt)],
      limit: opts.limit ?? 50,
    });
    const parsed = rows.map((row) => notificationRowSchema.parse(row));
    return opts.unreadOnly ? parsed.filter((n) => n.readAt === null) : parsed;
  }

  /**
   * Recipient+household must both match or NOT_FOUND (never reveals
   * existence). Idempotent when already read — returns the row unchanged.
   */
  async markNotificationRead(
    householdId: string,
    personId: string,
    notificationId: string,
  ): Promise<NotificationRecord> {
    const row = await this.uow.exec.query.notifications!.findFirst({
      where: eq(notifications.id, notificationId),
    });
    if (!row || row.householdId !== householdId || row.recipientPersonId !== personId) {
      throw new AppError('NOT_FOUND', 'Notification not found');
    }
    const current = notificationRowSchema.parse(row);
    if (current.readAt !== null) return current;
    const [updated] = await this.uow.exec
      .update(notifications)
      .set({ readAt: this.clock.now() })
      .where(eq(notifications.id, notificationId))
      .returning();
    return notificationRowSchema.parse(updated);
  }

  /** Single UPDATE over all unread rows for the recipient; returns affected count. */
  async markAllRead(householdId: string, personId: string): Promise<number> {
    const updated = await this.uow.exec
      .update(notifications)
      .set({ readAt: this.clock.now() })
      .where(
        and(
          eq(notifications.recipientPersonId, personId),
          eq(notifications.householdId, householdId),
          isNull(notifications.readAt),
        )!,
      )
      .returning();
    return updated.length;
  }

  /** Upsert of per-person category toggles (target: personId pk). */
  async putPrefs(personId: string, input: PutNotificationPrefsInput): Promise<NotificationPrefsRecord> {
    const [row] = await this.uow.exec
      .insert(notificationPrefs)
      .values({ personId, categories: input.categories })
      .onConflictDoUpdate({
        target: notificationPrefs.personId,
        set: { categories: input.categories },
      })
      .returning();
    return notificationPrefsRowSchema.parse(row);
  }

  /**
   * Story feed, newest first. SQL narrows to household + createdAt < cursor;
   * domain permission gate (allowedDomains) and payload/member/date filters
   * apply in JS. Pages FILL by batching — post-fetch filtering can shrink
   * any single batch, so never silently truncate.
   */
  async listActivity(
    householdId: string,
    allowedDomains: readonly ActivityDomain[],
    filters: ActivityFilters,
  ): Promise<ActivityPage> {
    const limit = filters.limit ?? 50;
    // Post-fetch filtering (domain gate + payload predicates) can shrink any
    // single batch, so pages FILL by looping batches until the requested
    // limit is met or the feed is exhausted — never silently truncated.
    const collected: ActivityEventRecord[] = [];
    let cursor = filters.cursor ?? null;
    for (let batch = 0; batch < 20 && collected.length <= limit; batch++) {
      const conditions = [eq(activityEvents.householdId, householdId)];
      if (cursor) conditions.push(lt(activityEvents.createdAt, new Date(cursor)));

      const rows = await this.uow.exec.query.activityEvents!.findMany({
        where: and(...conditions),
        orderBy: [desc(activityEvents.createdAt)],
        limit: 200,
      });
      if (rows.length === 0) break;

      let parsed = rows.map((row) => activityEventRowSchema.parse(row));
      parsed = parsed.filter((e) => allowedDomains.includes(e.domain));
      if (filters.actorPersonId !== undefined) {
        parsed = parsed.filter((e) => e.actorPersonId === filters.actorPersonId);
      }
      if (filters.actionType !== undefined) {
        parsed = parsed.filter((e) => e.type === filters.actionType);
      }
      if (filters.responsibilityTitle !== undefined) {
        parsed = parsed.filter((e) => e.payload.title === filters.responsibilityTitle);
      }
      if (filters.fromDate !== undefined) {
        parsed = parsed.filter((e) => isoDay(e.createdAt) >= filters.fromDate!);
      }
      if (filters.toDate !== undefined) {
        parsed = parsed.filter((e) => isoDay(e.createdAt) <= filters.toDate!);
      }

      collected.push(...parsed);
      const oldest = rows.at(-1);
      if (!oldest || rows.length < 200) break;
      cursor = new Date(oldest.createdAt as string | Date).toISOString();
    }

    const hasMore = collected.length > limit;
    const page = collected.slice(0, limit);
    const last = page.at(-1);
    return { events: page, nextCursor: hasMore && last ? last.createdAt.toISOString() : null };
  }
}
