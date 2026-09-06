'use client';

import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Button, Card, Field, Sheet } from '@/components/ui';
import { clearApiCache, useApiQuery } from '@/lib/api';
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
};

/** Person sheet: profile edit, contribution stats, view-as, delete. */
export function PersonSheet({
  person,
  onClose,
}: {
  person: PersonPayload | null;
  onClose: () => void;
}) {
  const dispatch = useDispatch();
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

  const stats = useApiQuery<{ occurrences: Occurrence[] }>({
    endpoint: { method: 'get', path: '/occurrences' },
    key: ['occurrences', 'stats', person?.id ?? ''] as const,
    options: { enabled: person !== null },
  });
  const rows = (stats.data?.occurrences ?? []).filter((o) => o.personIds.includes(person?.id ?? ''));
  const finished = rows.filter((o) => o.status === 'completed' && o.completedByPersonId === person?.id).length;
  const missed = rows.filter((o) => o.status === 'missed').length;

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

  const roleName = roles.data?.roles.find((r) => r.id === person.roleId)?.name ?? 'No role';

  return (
    <Sheet open onClose={onClose} title={`${person.avatarEmoji} ${person.name}`}>
      <div className="flex flex-col gap-4">
        <Card>
          <p className="text-sm">
            <span className="text-muted">Role:</span> {roleName}
          </p>
          <div className="mt-3 flex gap-6 text-center">
            <div>
              <p className="font-display text-2xl">{finished}</p>
              <p className="text-muted text-xs">finished</p>
            </div>
            <div>
              <p className="font-display text-2xl">{missed}</p>
              <p className="text-muted text-xs">missed</p>
            </div>
          </div>
        </Card>

        {canConfigure && (
          <Card>
            <Field label="Name" value={name} onChange={(e) => setName(e.target.value)} />
            <div className="mt-2 flex gap-2">
              <Button tone="quiet" disabled={update.isPending} onClick={saveName}>
                Save name
              </Button>
            </div>
            <label className="mt-3 block">
              <span className="text-sm font-semibold">Role</span>
              <select
                className="bg-surface text-ink border-line mt-1 w-full rounded-md border px-3 py-2 text-sm"
                value={person.roleId ?? ''}
                onChange={(e) => void saveRole(e.target.value)}
                disabled={update.isPending}
              >
                <option value="">No role</option>
                {(roles.data?.roles ?? []).map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                    {r.isOwnerRole ? ' ●' : ''}
                  </option>
                ))}
              </select>
            </label>
            <div className="mt-3">
              <Button
                tone="quiet"
                onClick={() => {
                  dispatch(enterViewAs(person.id));
                  clearApiCache();
                  onClose();
                }}
              >
                Preview as {person.name}
              </Button>
            </div>
          </Card>
        )}

        {canManage &&
          (confirmingDelete ? (
            <Card>
              <p className="text-sm">
                Remove {person.name}? Their account and sessions go too — history keeps their name.
              </p>
              <div className="mt-2 flex gap-2">
                <Button disabled={remove.isPending} onClick={() => void destroy()}>
                  Remove
                </Button>
                <Button tone="quiet" onClick={() => setConfirmingDelete(false)}>
                  Keep
                </Button>
              </div>
            </Card>
          ) : (
            <Button tone="quiet" onClick={() => setConfirmingDelete(true)}>
              Remove person
            </Button>
          ))}
      </div>
    </Sheet>
  );
}
