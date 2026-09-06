'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Button, Card, EmptyState, Field, Skeleton } from '@/components/ui';
import { useCreateRole, useResetRole, useRoles } from '@/features/household';

/** Role editor (§5.5): name-only save, reset-to-default, owner toggle display. */
export default function RolesPage() {
  const roles = useRoles();
  const create = useCreateRole();
  const reset = useResetRole();
  const [name, setName] = useState('');

  if (roles.isPending) {
    return (
      <div className="flex flex-col gap-3 pt-2">
        <Skeleton className="h-16" />
        <Skeleton className="h-16" />
      </div>
    );
  }
  if (roles.isError) {
    return (
      <EmptyState emoji="😕" title="Couldn't load roles" hint="Check your connection and try again." action={<Button onClick={() => roles.refetch()}>Retry</Button>} />
    );
  }

  async function onCreate(event: React.FormEvent) {
    event.preventDefault();
    if (name.trim().length === 0) return;
    await create.mutateAsync({ name: name.trim() });
    setName('');
  }

  return (
    <div>
      <Link href="/household" className="text-terracotta text-sm font-semibold">
        ← Household
      </Link>
      <h1 className="font-display mt-1 text-2xl">Family roles</h1>
      <div className="mt-3 flex flex-col gap-2">
        {roles.data.roles.map((r) => (
          <Card key={r.id} className="flex items-center gap-3 py-2">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">
                {r.name} {r.isOwnerRole && <span aria-label="owner">●</span>}
              </p>
              <p className="text-muted text-xs">
                {r.isBuiltin ? 'Built-in preset' : 'Custom role'} ·{' '}
                {Object.values(r.permissions).filter(Boolean).length} permissions
              </p>
            </div>
            <Button tone="quiet" disabled={reset.isPending} onClick={() => reset.mutate({ id: r.id })}>
              Reset
            </Button>
          </Card>
        ))}
      </div>
      <p className="text-muted mt-2 text-xs">
        Reset restores factory defaults for built-ins, or the create-time snapshot for custom roles.
      </p>
      <Card className="mt-4">
        <form onSubmit={onCreate} className="flex gap-2">
          <Field label="New role name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Homework helper" />
          <Button type="submit" disabled={create.isPending || name.trim().length === 0}>
            Add
          </Button>
        </form>
      </Card>
    </div>
  );
}
