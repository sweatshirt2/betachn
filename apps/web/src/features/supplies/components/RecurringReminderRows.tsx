'use client';

import { useTranslation } from 'react-i18next';
import { Button, Chip, Glyph } from '@/components/ui';
import { useCreateShoppingItem, useShoppingItems } from '@/features/shopping';
import {
  useArchiveRecurringItem,
  useRecurringItems,
  useSnoozeRecurringItem,
  useUpdateRecurringItem,
  type RecurringItemPayload,
  type RecurringStateKind,
} from '..';

/** Pure display twin of core's computeRecurringState for the wire payloads. */
function recurringStateOf(
  item: RecurringItemPayload,
  now: Date,
  openListItemExists: boolean,
): RecurringStateKind {
  if (item.state === 'paused' || item.archivedAt !== null) return 'idle';
  if (openListItemExists) return 'onList';
  if (item.lastPurchaseAt === null) return 'due';
  if (item.snoozedUntil !== null && now.getTime() < new Date(item.snoozedUntil).getTime()) {
    return 'snoozed';
  }
  const elapsed = Math.floor(
    (now.getTime() - new Date(item.lastPurchaseAt).getTime()) / 86_400_000,
  );
  if (elapsed < item.intervalDays) return 'idle';
  return elapsed === item.intervalDays ? 'due' : 'overdue';
}

function overdueDays(item: RecurringItemPayload, now: Date): number {
  if (item.lastPurchaseAt === null) return 0;
  return Math.max(
    0,
    Math.floor((now.getTime() - new Date(item.lastPurchaseAt).getTime()) / 86_400_000) -
      item.intervalDays,
  );
}

/** Preset → chip label (§4A.3: weekly / 2 weeks / monthly / custom days). */
function cadenceLabel(
  t: ReturnType<typeof useTranslation>['t'],
  days: number,
): string {
  if (days === 7) return t('pantry.cadenceWeekly');
  if (days === 14) return t('pantry.cadenceBiweekly');
  if (days === 30) return t('pantry.cadenceMonthly');
  return t('pantry.cadenceCustom', { days });
}

/**
 * Pantry reminder rows (§4A.4): REMINDERS ONLY — never an assumed purchase.
 * A due reminder with an open list item rests as "on the list", not an alert.
 * Exits: [Add to list] (one-off item) · [Bought it] (real purchase flow via
 * the existing shopping row — the anchor advances ONLY through purchase) ·
 * [···] overflow with Not-now (3-day snooze) / Pause / Archive. Overdue is
 * gentle text ("N days overdue"), never a red alarm (micro-45).
 */
export function RecurringReminderRows() {
  const { t } = useTranslation();
  const reminders = useRecurringItems();
  const shopping = useShoppingItems();
  const snooze = useSnoozeRecurringItem();
  const update = useUpdateRecurringItem();
  const archive = useArchiveRecurringItem();
  const createItem = useCreateShoppingItem();

  if (reminders.isPending || shopping.isPending) return null;
  const items = (reminders.data?.items ?? []).filter((r) => r.archivedAt === null);
  if (items.length === 0) return null;

  const now = new Date();
  const openItems = (shopping.data?.items ?? []).filter((i) => i.purchasedAt === null);
  const pendingAny = snooze.isPending || update.isPending || archive.isPending || createItem.isPending;

  const rows = items.map((item) => {
    // Supply-linked matching when the wire row carries a supply link;
    // otherwise exact name match (mirrors the server's dedup rule).
    const openMatch = openItems.some(
      (i: { name: string; sourceSupplyId?: string | null }) =>
        (item.supplyId !== null && i.sourceSupplyId === item.supplyId) ||
        i.name.toLowerCase() === item.name.toLowerCase(),
    );
    return { item, state: recurringStateOf(item, now, openMatch) };
  });
  // Due > overdue > onList > snoozed > idle — attention first, calm rest.
  const order: Record<RecurringStateKind, number> = { due: 0, overdue: 1, onList: 2, snoozed: 3, idle: 4 };
  rows.sort((a, b) => order[a.state] - order[b.state]);

  return (
    <div className="mt-2 flex flex-col gap-2">
      {rows.map(({ item, state }) => {
        const stateText =
          state === 'due'
            ? t('pantry.reminderDue')
            : state === 'overdue'
              ? t('pantry.reminderOverdue', { days: overdueDays(item, now) })
              : state === 'onList'
                ? t('pantry.reminderOnList')
                : state === 'snoozed'
                  ? t('pantry.reminderSnoozed')
                  : null;
        return (
          <div
            key={item.id}
            className="bg-card-wash border-line shadow-soft flex min-h-[3.25rem] items-center gap-3 rounded-xl border px-3 py-2"
          >
            <span
              aria-hidden
              className="bg-surface-alt border-line text-ink flex h-8 w-8 shrink-0 items-center justify-center rounded-[30%] border"
            >
              <Glyph name="repeat" className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate text-[15px] font-bold">{item.name}</p>
                <Chip>{cadenceLabel(t, item.intervalDays)}</Chip>
              </div>
              {stateText !== null && (
                <p className="text-muted mt-0.5 text-xs font-semibold">{stateText}</p>
              )}
            </div>
            {(state === 'due' || state === 'overdue') && (
              <div className="flex shrink-0 items-center gap-1.5">
                <Button
                  tone="on-wash"
                  disabled={pendingAny}
                  onClick={() => createItem.mutate({ name: item.name })}
                >
                  {t('pantry.addToShopping')}
                </Button>
                <button
                  type="button"
                  disabled={pendingAny}
                  onClick={() => snooze.mutate({ id: item.id })}
                  aria-label={t('pantry.notNowAria', { name: item.name })}
                  className="text-muted hover:text-ink px-1 text-xs font-bold"
                >
                  {t('pantry.notNow')}
                </button>
              </div>
            )}
            {state !== 'due' && state !== 'overdue' && (
              <button
                type="button"
                disabled={pendingAny}
                onClick={() =>
                  update.mutate({
                    id: item.id,
                    patch: { state: item.state === 'active' ? 'paused' : 'active' },
                  })
                }
                className="text-muted hover:text-ink px-1 text-xs font-bold"
              >
                {item.state === 'active' ? t('pantry.pause') : t('pantry.resume')}
              </button>
            )}
            <button
              type="button"
              disabled={pendingAny}
              onClick={() => archive.mutate({ id: item.id })}
              aria-label={t('pantry.archiveAria', { name: item.name })}
              className="text-muted hover:text-ink px-1 text-xs"
            >
              ✕
            </button>
          </div>
        );
      })}
    </div>
  );
}
