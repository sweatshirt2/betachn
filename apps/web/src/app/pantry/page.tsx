'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Button,
  Card,
  Chip,
  EmptyState,
  Field,
  Glyph,
  SectionWatermark,
  Skeleton,
  supplyGlyph,
  TaskDoneRow,
  TaskUpcomingRow,
  crayon,
} from '@/components/ui';
import { NavIcon } from '@/components/icons';
import { useToday } from '@/features/chores';
import { useCreateShoppingItem, usePurchaseItem, useShoppingItems } from '@/features/shopping';
import {
  useCreateSupply,
  useCycleSupply,
  useSupplies,
  SupplyFactsSubline,
  type SupplyState,
} from '@/features/supplies';
import { formatDate } from '@/lib/dates';

const NEXT: Record<SupplyState, SupplyState> = { available: 'low', low: 'out', out: 'available' };

/**
 * Pantry (§5.5 nav spec): the household's attention page — what is running
 * out, what to buy next, what deadlines approach. One composed surface with
 * three crafted sections instead of three flat lists.
 */
export default function PantryPage() {
  const { t } = useTranslation();
  const today = useToday();
  const supplies = useSupplies();
  const items = useShoppingItems();
  const createSupply = useCreateSupply();
  const cycle = useCycleSupply();
  const createItem = useCreateShoppingItem();
  const purchase = usePurchaseItem();
  const [supplyName, setSupplyName] = useState('');
  const [itemName, setItemName] = useState('');

  const pendingAny = createSupply.isPending || cycle.isPending || createItem.isPending || purchase.isPending;

  if (supplies.isPending || items.isPending) {
    return (
      <div className="flex flex-col gap-3 pt-2">
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
    );
  }
  if (supplies.isError || items.isError) {
    return (
      <EmptyState
        art="cloud"
        title={t('common.loadError')}
        hint={t('common.checkConnection')}
        action={<Button onClick={() => { supplies.refetch(); items.refetch(); }}>{t('common.retry')}</Button>}
      />
    );
  }

  const low = supplies.data.supplies.filter((s) => s.state === 'low');
  const out = supplies.data.supplies.filter((s) => s.state === 'out');
  const stocked = supplies.data.supplies.filter((s) => s.state === 'available');
  const openItems = items.data.items.filter((i) => i.purchasedAt === null);
  const bought = items.data.items.filter((i) => i.purchasedAt !== null);

  async function onAddSupply(event: React.FormEvent) {
    event.preventDefault();
    if (supplyName.trim().length === 0) return;
    await createSupply.mutateAsync({ name: supplyName.trim() });
    setSupplyName('');
  }

  async function onAddItem(event: React.FormEvent) {
    event.preventDefault();
    if (itemName.trim().length === 0) return;
    await createItem.mutateAsync({ name: itemName.trim() });
    setItemName('');
  }

  const stateChip = (state: SupplyState) =>
    state === 'available' ? (
      <Chip tone="success">{t('ops.supplyAvailable')}</Chip>
    ) : state === 'low' ? (
      <Chip tone="warning">{t('ops.supplyLow')}</Chip>
    ) : (
      <Chip tone="danger">{t('ops.supplyOut')}</Chip>
    );

  return (
    <div className="page-enter relative">
      <SectionWatermark variant="steam" />
      <h1 className="font-display text-2xl">{t('pantry.title')}</h1>
      <p className="text-muted mt-1 text-sm">{t('pantry.subtitle')}</p>

      {/* ── Section 1 · Running out ─────────────────────────────────────── */}
      <section className="mt-4" aria-label={t('pantry.runningOut')}>
        <div className="flex items-center gap-2">
          <h2 className="font-display text-lg">{t('pantry.runningOut')}</h2>
          {low.length + out.length > 0 && (
            <span className="bg-mustard text-ink rounded-full px-2 py-0.5 text-[10px] font-bold">
              {low.length + out.length}
            </span>
          )}
        </div>
        {out.length + low.length === 0 ? (
          <Card className="mt-2">
            <p className="text-muted text-sm">{t('pantry.stockedHint')}</p>
          </Card>
        ) : (
          <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {[...out, ...low].map((s, index) => (
              <Card key={s.id} className="lift-hover flex items-center gap-3.5 py-3.5">
                <span
                  aria-hidden
                  className="text-ink flex h-11 w-11 shrink-0 items-center justify-center rounded-[34%]"
                  style={{ background: crayon(index) }}
                >
                  <Glyph name={supplyGlyph(s.name)} className="h-5.5 w-5.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">{s.name}</p>
                  <div className="mt-1">{stateChip(s.state)}</div>
                  <SupplyFactsSubline supply={s} />
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1.5">
                  <Button
                    tone="on-wash"
                    disabled={pendingAny}
                    onClick={() => cycle.mutate({ id: s.id, state: NEXT[s.state] })}
                    aria-label={t('ops.markAria', { name: s.name, state: NEXT[s.state] })}
                  >
                    {s.state === 'out' ? t('pantry.boughtIt') : t('pantry.runningLowCta')}
                  </Button>
                  {!openItems.some((i) => i.name.toLowerCase() === s.name.toLowerCase()) && s.state !== 'available' && (
                    <button
                      type="button"
                      disabled={pendingAny}
                      onClick={() => createItem.mutate({ name: s.name })}
                      className="text-terracotta text-[11px] font-bold underline"
                    >
                      {t('pantry.toShopping')}
                    </button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* ── Section 2 · Shopping list ───────────────────────────────────── */}
      <section className="mt-6" aria-label={t('pantry.shopping')}>
        <div className="flex items-center gap-2">
          <h2 className="font-display text-lg">{t('pantry.shopping')}</h2>
          {openItems.length > 0 && (
            <span className="bg-surface-alt border-line rounded-full border px-2 py-0.5 text-[10px] font-bold">
              {openItems.length}
            </span>
          )}
        </div>
        <div className="mt-2 flex flex-col gap-2">
          {openItems.map((i) => (
            <div
              key={i.id}
              className="bg-card-wash border-line shadow-soft lift-hover flex min-h-[3.25rem] items-center gap-3 rounded-xl border px-3 py-2"
            >
              {/* Cart tile, not a ✓ — a checkmark on a pending row read as
                  "already done" (UI/UX iteration 1). */}
              <span
                aria-hidden
                className="bg-surface-alt border-line text-ink flex h-8 w-8 shrink-0 items-center justify-center rounded-[30%] border"
              >
                <Glyph name="cart" className="h-4 w-4" />
              </span>
              <p className="min-w-0 flex-1 truncate text-[15px] font-bold">{i.name}</p>
              <Button
                tone="on-wash"
                disabled={pendingAny}
                onClick={() => purchase.mutate({ id: i.id })}
                aria-label={t('ops.buyAria', { name: i.name })}
              >
                {t('ops.buy')}
              </Button>
            </div>
          ))}
          {openItems.length === 0 && (
            <p className="text-muted mt-1 text-sm">{t('ops.shoppingEmptyHint')}</p>
          )}
        </div>
        <Card className="mt-3">
          <form onSubmit={onAddItem} className="flex items-end gap-2">
            <div className="flex-1">
              <Field
                label={t('ops.addItem')}
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                placeholder={t('ops.itemPlaceholder')}
              />
            </div>
            <Button type="submit" disabled={createItem.isPending || itemName.trim().length === 0}>
              {t('common.add')}
            </Button>
          </form>
        </Card>
        {bought.length > 0 && (
          <details className="mt-3">
            <summary className="text-muted cursor-pointer text-sm font-semibold">
              {t('ops.bought', { count: bought.length })}
            </summary>
            <div className="mt-2 flex flex-col gap-1.5 opacity-75">
              {bought.map((i) => (
                <TaskUpcomingRow key={i.id} title={i.name} />
              ))}
            </div>
          </details>
        )}
      </section>

      {/* ── Section 3 · Everything else (stocked + deadlines) ───────────── */}
      <section className="mt-6" aria-label={t('pantry.stocked')}>
        <h2 className="font-display text-lg">{t('pantry.stocked')}</h2>
        {stocked.length === 0 ? (
          <p className="text-muted mt-2 text-sm">{t('pantry.noSupplies')}</p>
        ) : (
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {/* Stocked tiles: emoji tile + name + state pill — balanced
                columns, not number dumps. */}
            {stocked.map((s, index) => (
              <Card key={s.id} className="lift-hover py-3">
                <div className="flex flex-col items-center gap-1.5">
                  <span
                    aria-hidden
                    className="text-ink flex h-9 w-9 items-center justify-center rounded-[34%]"
                    style={{ background: crayon(index) }}
                  >
                    <Glyph name={supplyGlyph(s.name)} className="h-4.5 w-4.5" />
                  </span>
                  <p className="w-full truncate text-center text-sm font-bold">{s.name}</p>
                  <span
                    role="status"
                    className="text-muted bg-surface-alt border-line rounded-full border px-2 py-0.5 text-[10px] font-bold"
                  >
                    {t('ops.supplyAvailable')}
                  </span>
                </div>
              </Card>
            ))}
          </div>
        )}

        {(today.data?.maintenanceDue.length ?? 0) > 0 && (
          <div className="mt-5">
            <div className="flex items-center gap-2">
              <h2 className="font-display text-lg">{t('pantry.deadlines')}</h2>
              <span className="bg-clay-red/20 text-ink rounded-full px-2 py-0.5 text-[10px] font-bold">
                {today.data?.maintenanceDue.length}
              </span>
            </div>
            <div className="mt-2 flex flex-col gap-2">
              {today.data?.maintenanceDue.map((m) => (
                <Card key={m.assetId} className="lift-hover flex items-center gap-3.5 py-3">
                  <span
                    aria-hidden
                    className="bg-wash flex h-10 w-10 shrink-0 items-center justify-center rounded-[32%]"
                  >
                    <NavIcon name="routines" className="h-5 w-5" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold">{m.assetName}</p>
                    <p className="text-muted mt-0.5 text-xs font-semibold">{t('ops.dueDate', { date: formatDate(m.nextDue) })}</p>
                  </div>
                  <Chip tone="warning">{t('pantry.upcoming')}</Chip>
                </Card>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* ── Quick add supply ────────────────────────────────────────────── */}
      <Card className="mt-6">
        <form onSubmit={onAddSupply} className="flex items-end gap-2">
          <div className="flex-1">
            <Field
              label={t('ops.newSupply')}
              value={supplyName}
              onChange={(e) => setSupplyName(e.target.value)}
              placeholder={t('ops.supplyPlaceholder')}
            />
          </div>
          <Button type="submit" disabled={createSupply.isPending || supplyName.trim().length === 0}>
            {t('common.add')}
          </Button>
        </form>
      </Card>
    </div>
  );
}
