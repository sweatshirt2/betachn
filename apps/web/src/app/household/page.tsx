'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Card, EmptyState, PersonAvatar, SectionWatermark, Skeleton } from '@/components/ui';
import { NavIcon } from '@/components/icons';
import { PersonSheet, usePeople, useRoles, type PersonPayload } from '@/features/household';

export default function HouseholdPage() {
  const { t } = useTranslation();
  const people = usePeople();
  const roles = useRoles();
  const [selected, setSelected] = useState<PersonPayload | null>(null);

  if (people.isPending) {
    return (
      <div className="flex flex-col gap-3 pt-2">
        <Skeleton className="h-16" />
        <Skeleton className="h-16" />
      </div>
    );
  }
  if (people.isError) {
    return (
      <EmptyState emoji="😕" title={t('common.loadError')} hint={t('common.checkConnection')} action={<Button onClick={() => people.refetch()}>{t('common.retry')}</Button>} />
    );
  }

  const roleName = (roleId: string | null) =>
    roles.data?.roles.find((r) => r.id === roleId)?.name ?? t('household.noRole');
  const isOwner = (roleId: string | null) =>
    roles.data?.roles.find((r) => r.id === roleId)?.isOwnerRole === true;

  return (
    <div className="relative">
      <SectionWatermark variant="house" />
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl">{t('household.title')}</h1>
        <Link href="/setup/roles">
          <Button tone="quiet">{t('household.roles')}</Button>
        </Link>
      </div>      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {people.data.people.map((p, index) => {
          const owner = isOwner(p.roleId);
          return (
            <Card key={p.id} className="lift-hover py-4">
              <button
                className="flex w-full items-center gap-4 text-left"
                onClick={() => setSelected(p)}
                aria-label={p.name}
              >
                <PersonAvatar emoji={p.avatarEmoji} index={index} size="md" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-base font-bold">
                    {p.name}
                  </span>
                  <span className="text-muted mt-0.5 flex items-center gap-1.5 text-xs font-semibold">
                    {owner && <NavIcon name="owner" variant="filled" className="text-accent h-3.5 w-3.5" aria-hidden />}
                    {roleName(p.roleId)}
                  </span>
                </span>
                <span className="text-muted" aria-hidden>
                  ›
                </span>
              </button>
            </Card>
          );
        })}
      </div>
      <PersonSheet key={selected?.id ?? 'none'} person={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
