'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, EmptyState, MemberCard, SectionWatermark, Skeleton } from '@/components/ui';
import { PersonSheet, roleDisplayName, usePeople, useRoles, type PersonPayload } from '@/features/household';
import { personFactsTag } from '@/lib/facts';

export default function HouseholdPage() {
  const { t } = useTranslation();
  const people = usePeople();
  const roles = useRoles();
  const [selected, setSelected] = useState<PersonPayload | null>(null);

  if (people.isPending) {
    return (
      <div className="flex flex-col gap-3 pt-2">
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
      </div>
    );
  }
  if (people.isError) {
    return (
      <EmptyState
        art="cloud"
        title={t('common.loadError')}
        hint={t('common.checkConnection')}
        action={<Button onClick={() => people.refetch()}>{t('common.retry')}</Button>}
      />
    );
  }

  return (
    <div className="relative">
      <SectionWatermark variant="house" />
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl">{t('household.title')}</h1>
        <Link href="/setup/roles">
          <Button tone="quiet">{t('household.roles')}</Button>
        </Link>
      </div>
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {people.data.people.map((p, index) => {
          const role = roles.data?.roles.find((r) => r.id === p.roleId) ?? null;
          return (
            <MemberCard
              key={p.id}
              index={index}
              emoji={p.avatarEmoji}
              name={p.name}
              owner={role?.isOwnerRole === true}
              role={roleDisplayName(role, t)}
              factsTag={personFactsTag(p, t)}
              onOpen={() => setSelected(p)}
            />
          );
        })}
      </div>
      <PersonSheet key={selected?.id ?? 'none'} person={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
