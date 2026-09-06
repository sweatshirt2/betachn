'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Button, Card, EmptyState, SectionWatermark, Skeleton } from '@/components/ui';
import { PersonSheet, usePeople, useRoles, type PersonPayload } from '@/features/household';

export default function HouseholdPage() {
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
      <EmptyState emoji="😕" title="Couldn't load household" hint="Check your connection and try again." action={<Button onClick={() => people.refetch()}>Retry</Button>} />
    );
  }

  const roleName = (roleId: string | null) =>
    roles.data?.roles.find((r) => r.id === roleId)?.name ?? 'No role';
  const isOwner = (roleId: string | null) =>
    roles.data?.roles.find((r) => r.id === roleId)?.isOwnerRole === true;

  return (
    <div className="relative">
      <SectionWatermark variant="house" />
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl">Household</h1>
        <Link href="/setup/roles">
          <Button tone="quiet">Roles</Button>
        </Link>
      </div>
      <div className="mt-3 flex flex-col gap-2">
        {people.data.people.map((p) => (
          <Card key={p.id}>
            <button className="flex w-full items-center gap-3 text-left" onClick={() => setSelected(p)}>
              <span className="text-2xl" aria-hidden>
                {p.avatarEmoji}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">
                  {p.name} {isOwner(p.roleId) && <span aria-label="owner">●</span>}
                </span>
                <span className="text-muted text-xs">{roleName(p.roleId)}</span>
              </span>
            </button>
          </Card>
        ))}
      </div>
      <PersonSheet key={selected?.id ?? 'none'} person={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
