'use client';

import { useState } from 'react';
import { useSelector } from 'react-redux';
import { Button, Card, EmptyState, Skeleton } from '@/components/ui';
import { queryKeys, useApiQuery } from '@/lib/api';
import type { RootState } from '@/store';

type Person = { id: string; name: string };
type Occurrence = { id: string; title: string; dueDate: string; personIds: string[] };

function mondayOf(date: Date): Date {
  const d = new Date(date);
  const back = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - back);
  return d;
}

/** Fridge sheet preview (§5.6): zero-config defaults, print via browser chrome. */
export default function PrintPage() {
  const token = useSelector((state: RootState) => state.auth.token);
  const household = useSelector((state: RootState) => state.auth.household);
  const [weekOffset, setWeekOffset] = useState(0);
  const [memberFilter, setMemberFilter] = useState<string>('all');
  const [checkboxes, setCheckboxes] = useState(true);

  const monday = mondayOf(new Date(Date.now() + weekOffset * 7 * 86_400_000));
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const from = iso(monday);
  const to = iso(new Date(monday.getTime() + 6 * 86_400_000));

  const people = useApiQuery<{ people: Person[] }>({
    endpoint: { method: 'get', path: '/profiles' },
    key: queryKeys.profiles(),
    options: { enabled: token !== null },
  });
  const occurrences = useApiQuery<{ occurrences: Occurrence[] }>({
    endpoint: { method: 'get', path: '/occurrences' },
    queryParams: { from, to },
    key: ['occurrences', 'print', from, to] as const,
    options: { enabled: token !== null },
  });

  if (!token) {
    return <EmptyState emoji="🖨️" title="Sign in to print" hint="Weekly sheets print from your household." />;
  }
  if (people.isPending || occurrences.isPending) {
    return (
      <div className="flex flex-col gap-3 pt-2">
        <Skeleton className="h-40" />
      </div>
    );
  }
  if (people.isError || occurrences.isError) {
    return <EmptyState emoji="😕" title="Couldn't load the sheet" hint="Check your connection and try again." action={<Button onClick={() => { people.refetch(); occurrences.refetch(); }}>Retry</Button>} />;
  }

  const names = new Map(people.data.people.map((p) => [p.id, p.name] as const));
  const rows = occurrences.data.occurrences.filter(
    (o) => memberFilter === 'all' || o.personIds.includes(memberFilter),
  );

  return (
    <div>
      <div className="flex items-center justify-between" data-no-print>
        <h1 className="font-display text-2xl">Print week</h1>
        <Button onClick={() => window.print()}>Print</Button>
      </div>
      <details className="mt-2" data-no-print>
        <summary className="text-terracotta text-sm font-semibold">Customize</summary>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Button tone="quiet" onClick={() => setWeekOffset((w) => w - 1)}>
            ← Prev week
          </Button>
          <Button tone="quiet" onClick={() => setWeekOffset((w) => w + 1)}>
            Next week →
          </Button>
          <select
            className="bg-surface text-ink border-line rounded-md border px-2 py-2 text-sm"
            value={memberFilter}
            onChange={(e) => setMemberFilter(e.target.value)}
            aria-label="Members"
          >
            <option value="all">Everyone</option>
            {people.data.people.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-1 text-sm">
            <input type="checkbox" checked={checkboxes} onChange={(e) => setCheckboxes(e.target.checked)} />
            Checkboxes
          </label>
        </div>
      </details>

      <Card className="mt-3">
        <p className="font-display text-lg">
          {household?.name ?? 'Household'} · {from} – {to}
        </p>
        <table className="mt-2 w-full text-left text-sm">
          <tbody>
            {rows.map((o) => (
              <tr key={o.id} className="border-line border-t">
                {checkboxes && (
                  <td className="w-8 py-1">
                    <span className="border-line inline-block h-4 w-4 rounded-sm border-2" aria-hidden />
                  </td>
                )}
                <td className="py-1 font-semibold">{o.title}</td>
                <td className="text-muted py-1 text-xs">
                  {o.personIds.map((id) => names.get(id) ?? '').join(', ')} · {o.dueDate}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <p className="text-muted py-4 text-center text-sm">Nothing scheduled this week.</p>}
      </Card>
    </div>
  );
}
