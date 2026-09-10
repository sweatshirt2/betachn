'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { PERMISSION_CATALOG, type PermKey } from '@chorify/core/permissions';
import { Button, Card, Field, Sheet } from '@/components/ui';
import { clearApiCache, useApiQuery } from '@/lib/api';
import { deviceOccurrences } from '@/lib/device/reads';
import { enterViewAs, type RootState } from '@/store';
import {
  useDeletePerson,
  useRoles,
  useUpdatePerson,
  type PersonPayload,
} from '@/features/household';

type Occurrence = {
  status: string;
  completedByPersonId: string | null;
  personIds: string[];
  completedAt: string | null;
  dueDate: string;
  title?: string;
};

function isoDay(offsetDays: number): string {
  return new Date(Date.now() + offsetDays * 86_400_000).toISOString().slice(0, 10);
}

/** Person sheet (§5.5/D16): facts-only contribution stats, role/permission editing. */
export function PersonSheet({
  person,
  onClose,
}: {
  person: PersonPayload | null;
  onClose: () => void;
}) {
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const canConfigure = useSelector(
    (state: RootState) => state.auth.permissionMap['household.configure_permissions'] === true,
  );
  const canManage = useSelector(
    (state: RootState) => state.auth.permissionMap['household.remove_people'] === true,
  );
  const update = useUpdatePerson();
  const remove = useDeletePerson();
  const roles = useRoles();
  const [name, setName] = useState(person?.name ?? '');
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [permissionsOpen, setPermissionsOpen] = useState(false);

  const mode = useSelector((state: RootState) => state.auth.mode);
  const stats = useApiQuery<{ occurrences: Occurrence[] }>({
    endpoint: { method: 'get', path: '/occurrences' },
    key: ['occurrences', 'stats', person?.id ?? ''] as const,
    options: {
      enabled: person !== null,
      queryFn:
        mode === 'device'
          ? () =>
              deviceOccurrences({ from: isoDay(-89) }).then(
                (r) => ({ occurrences: r.occurrences }) as unknown as { occurrences: Occurrence[] },
              )
          : undefined,
    },
  });

  const personId = person?.id ?? '';
  // "Finished" = chores this person actually completed — assigned OR taken
  // (§6: claim = complete, completedBy records the taker). "Missed" stays
  // assignment-based: only chores they were on the hook for.
  const completedRows = (stats.data?.occurrences ?? []).filter(
    (o) => o.status === 'completed' && o.completedByPersonId === personId,
  );
  const missed = (stats.data?.occurrences ?? []).filter(
    (o) => o.status === 'missed' && o.personIds.includes(personId),
  ).length;

  const weekStart = isoDay(-6);
  const monthStart = isoDay(-29);
  const finishedWeek = completedRows.filter((o) => (o.completedAt ?? '').slice(0, 10) >= weekStart).length;
  const finishedMonth = completedRows.filter((o) => (o.completedAt ?? '').slice(0, 10) >= monthStart).length;

  // 8-week trend (§5.5): completed per ISO week, oldest → newest. Sparkline
  // path is hand-rolled — no chart dependency.
  const trend = useMemo(() => {
    const buckets = new Array(8).fill(0) as number[];
    for (const o of completedRows) {
      if (!o.completedAt) continue;
      const daysAgo = Math.floor((Date.now() - new Date(o.completedAt).getTime()) / 86_400_000);
      const weekIndex = 7 - Math.min(7, Math.floor(daysAgo / 7));
      if (weekIndex >= 0 && weekIndex < 8) buckets[weekIndex] = (buckets[weekIndex] ?? 0) + 1;
    }
    return buckets;
  }, [completedRows]);

  // Breakdown by responsibility (§5.5): completed count per chore title.
  const breakdown = useMemo(() => {
    const byTitle = new Map<string, number>();
    for (const o of completedRows) {
      const title = o.title ?? '—';
      byTitle.set(title, (byTitle.get(title) ?? 0) + 1);
    }
    return [...byTitle.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [completedRows]);

  const sparkMax = Math.max(1, ...trend);
  const sparkPoints = trend
    .map((count, i) => `${(i / 7) * 100},${28 - (count / sparkMax) * 24}`)
    .join(' ');

  const role = roles.data?.roles.find((r) => r.id === person?.roleId) ?? null;
  const hasAccount = person !== null && person.phone !== null;

  if (!person) return null;

  async function saveRole(roleId: string) {
    await update.mutateAsync({ id: person!.id, roleId: roleId === '' ? null : roleId });
  }

  async function saveName() {
    if (name.trim().length === 0 || name === person!.name) return;
    await update.mutateAsync({ id: person!.id, name: name.trim() });
  }

  async function destroy() {
    await remove.mutateAsync({ id: person!.id, name: person!.name });
    onClose();
  }

  const roleName = role?.name ?? t('household.noRole');

  return (
    <Sheet open onClose={onClose} title={`${person.avatarEmoji} ${person.name}`}>
      <div className="flex flex-col gap-4">
        <Card>
          <p className="text-sm">
            <span className="text-muted">{t('household.roleLabel')}:</span> {roleName}
          </p>
          <div className="mt-3 grid grid-cols-2 gap-3 text-center">
            <div className="rounded-md bg-cream p-2">
              <p className="font-display text-xl">{finishedWeek}</p>
              <p className="text-muted text-xs">{t('household.finishedWeek')}</p>
            </div>
            <div className="rounded-md bg-cream p-2">
              <p className="font-display text-xl">{finishedMonth}</p>
              <p className="text-muted text-xs">{t('household.finishedMonth')}</p>
            </div>
            <div>
              <p className="font-display text-2xl">{completedRows.length}</p>
              <p className="text-muted text-xs">{t('household.finished')}</p>
            </div>
            <div>
              <p className="font-display text-2xl">{missed}</p>
              <p className="text-muted text-xs">{t('household.missed')}</p>
            </div>
          </div>
          <svg viewBox="0 0 100 30" className="text-olive mt-3 h-8 w-full" preserveAspectRatio="none" aria-hidden>
            <polyline points={sparkPoints} fill="none" stroke="currentColor" strokeWidth="2" vectorEffect="non-scaling-stroke" />
          </svg>
          <p className="text-muted mt-1 text-center text-xs">{t('household.trend8w')}</p>

          {breakdown.length > 0 && (
            <div className="mt-3">
              <p className="text-muted text-xs font-semibold uppercase">{t('household.breakdown')}</p>
              <ul className="mt-1 flex flex-col gap-1">
                {breakdown.map(([title, count]) => (
                  <li key={title} className="flex items-center justify-between text-sm">
                    <span className="truncate">{title}</span>
                    <span className="text-muted">{count}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>

        {canConfigure && (
          <Card>
            <Field label={t('common.name')} value={name} onChange={(e) => setName(e.target.value)} />
            <div className="mt-2 flex gap-2">
              <Button tone="quiet" disabled={update.isPending} onClick={saveName}>
                {t('household.saveName')}
              </Button>
              <Link href={`/print?member=${person.id}`} className="contents">
                <Button tone="quiet">{t('household.printWeekly')}</Button>
              </Link>
            </div>
            <label className="mt-3 block">
              <span className="text-sm font-semibold">{t('household.roleLabel')}</span>
              <select
                className="bg-surface text-ink border-line mt-1 w-full rounded-md border px-3 py-2 text-sm"
                value={person.roleId ?? ''}
                onChange={(e) => void saveRole(e.target.value)}
                disabled={update.isPending}
              >
                <option value="">{t('household.noRole')}</option>
                {(roles.data?.roles ?? []).map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                    {r.isOwnerRole ? ' ●' : ''}
                  </option>
                ))}
              </select>
            </label>

            <p className="text-muted mt-3 text-xs">{t('household.boundarySentence', { name: person.name, role: roleName })}</p>

            <div className="mt-3 flex flex-wrap gap-2">
              <Button tone="quiet" onClick={() => setPermissionsOpen(true)}>
                {t('household.customizePermissions')}
              </Button>
              <Button tone="quiet" disabled>
                {hasAccount ? t('household.changePassword') : t('household.createAccount')}
              </Button>
            </div>

            <div className="mt-3">
              <Button
                tone="quiet"
                onClick={() => {
                  dispatch(enterViewAs(person.id));
                  clearApiCache();
                  onClose();
                }}
              >
                {t('household.previewAsName', { name: person.name })}
              </Button>
            </div>
          </Card>
        )}

        {canManage &&
          (confirmingDelete ? (
            <Card>
              <p className="text-sm">{t('household.removeConfirm', { name: person.name })}</p>
              <div className="mt-2 flex gap-2">
                <Button disabled={remove.isPending} onClick={() => void destroy()}>
                  {t('household.removePerson')}
                </Button>
                <Button tone="quiet" onClick={() => setConfirmingDelete(false)}>
                  {t('household.keep')}
                </Button>
              </div>
            </Card>
          ) : (
            <Button tone="quiet" onClick={() => setConfirmingDelete(true)}>
              {t('household.removePerson')}
            </Button>
          ))}
      </div>

      <PermissionCustomizer
        open={permissionsOpen}
        person={person}
        roleMatrix={role?.permissions ?? null}
        onClose={() => setPermissionsOpen(false)}
        onSave={async (overrides) => {
          await update.mutateAsync({ id: person.id, permissionOverrides: overrides });
          setPermissionsOpen(false);
        }}
        saving={update.isPending}
      />
    </Sheet>
  );
}

/**
 * Per-domain permission customizer (CN §25–26): switches pre-filled from the
 * role matrix; person-specific deviations carry an "override" highlight.
 * Server re-authorizes everything — this is display + intent capture.
 */
function PermissionCustomizer({
  open,
  person,
  roleMatrix,
  onClose,
  onSave,
  saving,
}: {
  open: boolean;
  person: PersonPayload;
  roleMatrix: Record<string, boolean> | null;
  onClose: () => void;
  onSave: (overrides: Record<string, boolean>) => Promise<void>;
  saving: boolean;
}) {
  const { t } = useTranslation();
  const [overrides, setOverrides] = useState<Record<string, boolean>>(person.permissionOverrides ?? {});

  const domains = Object.entries(PERMISSION_CATALOG) as Array<[string, readonly string[]]>;

  function toggle(key: PermKey, base: boolean) {
    setOverrides((current) => {
      const next = { ...current };
      const effective = key in current ? current[key] : base;
      if (effective === !base) {
        delete next[key]; // back to role default
      } else {
        next[key] = !base;
      }
      return next;
    });
  }

  return (
    <Sheet open={open} onClose={onClose} title={t('household.customizePermissions')}>
      <p className="text-muted text-sm">{t('household.permissionsHint')}</p>
      <div className="mt-3 flex max-h-96 flex-col gap-4 overflow-y-auto pr-1">
        {domains.map(([domain, keys]) => (
          <fieldset key={domain}>
            <legend className="text-sm font-semibold">{t(`perms.domains.${domain}`)}</legend>
            <div className="mt-1 flex flex-col gap-1.5">
              {keys.map((action) => {
                const key = `${domain}.${action}` as PermKey;
                const isOverride = key in overrides;
                const effective = isOverride ? overrides[key] : (roleMatrix?.[key] ?? false);
                return (
                  <label key={key} className="flex items-center justify-between gap-2 rounded-sm px-2 py-1 text-sm odd:bg-cream">
                    <span className={isOverride ? 'font-semibold text-terracotta' : ''}>
                      {t(`perms.${domain}.${action}`)}
                      {isOverride ? ' ●' : ''}
                    </span>
                    <input
                      type="checkbox"
                      className="accent-terracotta"
                      checked={effective}
                      disabled={saving}
                      onChange={() => toggle(key, roleMatrix?.[key] ?? false)}
                    />
                  </label>
                );
              })}
            </div>
          </fieldset>
        ))}
      </div>
      <div className="mt-4 flex gap-2">
        <Button disabled={saving} onClick={() => void onSave(overrides)}>
          {t('common.save')}
        </Button>
        <Button tone="quiet" onClick={onClose}>
          {t('common.cancel')}
        </Button>
      </div>
    </Sheet>
  );
}
