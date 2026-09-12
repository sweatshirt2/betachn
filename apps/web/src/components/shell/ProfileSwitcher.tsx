'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { ApiError } from '@/lib/api';
import { personFactsTag } from '@/lib/facts';
import { AccountSwitcherCard, Sheet } from '@/components/ui';
import { useSwitchProfile } from '@/features/auth';
import { usePeople, useRoles } from '@/features/household';
import { type RootState } from '@/store';

/**
 * Account switcher sheet (§4.6): a level, decorated list — every member is
 * one self-contained card with a state zone on the right. Password gates open
 * inside the same card so the list never shifts height. The active card shows
 * the "In use" pill; credentialed members carry a small PIN hint on their
 * identity line so the gate never surprises anyone.
 */
export function ProfileSwitcher({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const activePerson = useSelector((state: RootState) => state.auth.activePerson);
  const people = usePeople();
  const roles = useRoles();
  const switchMut = useSwitchProfile();
  const [gatedId, setGatedId] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [failed, setFailed] = useState(false);

  const error = switchMut.error;
  const needsPassword =
    gatedId !== null || (error instanceof ApiError && error.code === 'PASSWORD_REQUIRED');
  const wrongPassword = failed || (error instanceof ApiError && error.code === 'WRONG_PASSWORD');

  if (switchMut.isSuccess && open) {
    onClose();
    switchMut.reset();
  }

  function pick(personId: string) {
    setGatedId(null);
    setPassword('');
    setFailed(false);
    switchMut.reset();
    switchMut.mutate(
      { personId },
      {
        onError: (err) => {
          if (err instanceof ApiError && err.code === 'PASSWORD_REQUIRED') setGatedId(personId);
          if (err instanceof ApiError && err.code === 'WRONG_PASSWORD') setFailed(true);
        },
      },
    );
  }

  function submitPassword() {
    if (!gatedId) return;
    setFailed(false);
    switchMut.mutate(
      { personId: gatedId, password },
      {
        onError: (err) => {
          if (err instanceof ApiError && err.code === 'WRONG_PASSWORD') setFailed(true);
        },
      },
    );
  }

  return (
    <Sheet open={open} onClose={onClose} title={t('auth.switchProfile')}>
      <div className="flex flex-col gap-2.5">
        {(people.data?.people ?? []).map((p, index) => {
          const active = switchMut.variables?.personId === p.id && switchMut.isPending;
          const roleName = roles.data?.roles.find((r) => r.id === p.roleId)?.name ?? null;
          const isOwner = roles.data?.roles.find((r) => r.id === p.roleId)?.isOwnerRole === true;
          const who = [
            isOwner ? `★ ${roleName ?? ''}` : roleName,
            p.phone !== null ? t('switcher.hasPin') : null,
          ]
            .filter(Boolean)
            .join(' · ');
          return (
            <AccountSwitcherCard
              key={p.id}
              index={index}
              emoji={p.avatarEmoji}
              name={p.name}
              who={who || personFactsTag(p, t) || undefined}
              status={
                activePerson?.id === p.id
                  ? 'active'
                  : gatedId === p.id
                    ? 'password'
                    : 'pick'
              }
              activePerson={activePerson?.id === p.id ? t('switcher.inUse') : undefined}
              busy={switchMut.isPending && !active}
              password={password}
              passwordError={wrongPassword && gatedId === p.id ? t('auth.wrongPassword') : undefined}
              onPasswordChange={setPassword}
              onSubmitPassword={submitPassword}
              onCancelPassword={() => {
                setGatedId(null);
                setPassword('');
                setFailed(false);
              }}
              onPick={() => pick(p.id)}
            />
          );
        })}
      </div>
    </Sheet>
  );
}
