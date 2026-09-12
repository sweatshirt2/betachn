'use client';

import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { PersonAvatar } from '@/components/ui';
import { NavIcon } from '@/components/icons';
import { usePeople, useRoles } from '@/features/household';
import { personFactsTag } from '@/lib/facts';
import type { RootState } from '@/store';

/**
 * Header identity chip (§5.5 header spec): avatar tile + display name +
 * role line; tapping opens the account switcher. Owners wear the star.
 * Identity fields come from the /profiles read — no auth-contract change.
 */
export function ProfileChip({ onOpen }: { onOpen: () => void }) {
  const { t } = useTranslation();
  const activePerson = useSelector((state: RootState) => state.auth.activePerson);
  const people = usePeople();
  const roles = useRoles();

  if (!activePerson) return null;

  const me = people.data?.people.find((p) => p.id === activePerson.id) ?? null;
  const role = roles.data?.roles.find((r) => r.id === me?.roleId) ?? null;
  const roleLine = role ? `${role.isOwnerRole ? '★ ' : ''}${role.name}` : t('household.noRole');
  const factsTag = me !== null ? personFactsTag(me, t) : null;

  return (
    <button
      type="button"
      onClick={onOpen}
      className="lift-hover bg-card-wash border-line shadow-soft flex items-center gap-2.5 rounded-full border py-1.5 pl-1.5 pr-3 text-left"
      aria-label={t('auth.switchProfileAria', { name: activePerson.name })}
    >
      {me?.avatarEmoji ? (
        <PersonAvatar emoji={me.avatarEmoji} index={0} size="sm" />
      ) : (
        <span
          aria-hidden
          className="shadow-soft text-ink flex h-8 w-8 items-center justify-center rounded-[30%] bg-[var(--chorify-crayon-1)] text-sm font-bold"
        >
          {activePerson.name.trim().charAt(0).toUpperCase() || '?'}
        </span>
      )}
      <span className="min-w-0">
        <span className="block max-w-28 truncate text-sm font-bold leading-tight sm:max-w-40">{activePerson.name}</span>
        <span className="text-muted block max-w-28 truncate text-[10px] font-semibold leading-tight sm:max-w-40">
          {roleLine}
          {factsTag !== null && <span aria-hidden> · </span>}
          {factsTag}
        </span>
      </span>
      <NavIcon name="more" variant="outline" className="text-muted h-4 w-4 shrink-0" aria-hidden />
    </button>
  );
}
