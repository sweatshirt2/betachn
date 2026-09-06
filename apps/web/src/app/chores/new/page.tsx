'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { Button, Card, Field } from '@/components/ui';
import { useCreateResponsibility } from '@/features/chores';
import { queryKeys, useApiQuery } from '@/lib/api';
import type { RootState } from '@/store';

type Person = { id: string; name: string };
type Pattern = 'once' | 'daily' | 'weekly' | 'monthly';

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Minimal chore composer: title + cadence + assignees. Power options (rotation, ranges) arrive next. */
export default function NewChorePage() {
  const { t } = useTranslation();
  const router = useRouter();
  const token = useSelector((state: RootState) => state.auth.token);
  const create = useCreateResponsibility();
  const [title, setTitle] = useState('');
  const [pattern, setPattern] = useState<Pattern>('daily');
  const [assignees, setAssignees] = useState<string[]>([]);

  const people = useApiQuery<{ people: Person[] }>({
    endpoint: { method: 'get', path: '/profiles' },
    key: queryKeys.profiles(),
    options: { enabled: token !== null },
  });

  function toggleAssignee(id: string) {
    setAssignees((current) => (current.includes(id) ? current.filter((x) => x !== id) : [...current, id]));
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    try {
      await create.mutateAsync({
        title: title.trim(),
        subtasks: [],
        rules: [{ pattern, startDate: todayIso(), personIds: assignees }],
      });
      router.push('/chores');
    } catch {
      // Field-level errors surface below via mutation state.
    }
  }

  return (
    <div>
      <Link href="/chores" className="text-terracotta text-sm font-semibold">
        ← {t('chores.title')}
      </Link>
      <h1 className="font-display mt-1 text-2xl">{t('chores.newChore')}</h1>
      <Card className="mt-3">
        <form onSubmit={onSubmit} className="flex flex-col gap-3">
          <Field label={t('chores.choreTitle')} value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t('chores.titlePlaceholder')} />
          <label className="block">
            <span className="text-sm font-semibold">{t('chores.repeats')}</span>
            <select
              className="bg-surface text-ink border-line mt-1 w-full rounded-md border px-3 py-2 text-sm"
              value={pattern}
              onChange={(e) => setPattern(e.target.value as Pattern)}
            >
              <option value="once">{t('chores.once')}</option>
              <option value="daily">{t('chores.daily')}</option>
              <option value="weekly">{t('chores.weekly')}</option>
              <option value="monthly">{t('chores.monthly')}</option>
            </select>
          </label>
          <fieldset>
            <legend className="text-sm font-semibold">{t('chores.assignedTo')}</legend>
            <div className="mt-1 flex flex-wrap gap-2">
              {(people.data?.people ?? []).map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => toggleAssignee(p.id)}
                  aria-pressed={assignees.includes(p.id)}
                  className={`rounded-sm border px-3 py-1 text-sm font-semibold ${assignees.includes(p.id) ? 'bg-terracotta text-terracotta-ink border-terracotta' : 'bg-surface text-ink border-line'}`}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </fieldset>
          <Button type="submit" disabled={create.isPending || title.trim().length === 0}>
            {create.isPending ? t('chores.adding') : t('chores.addChore')}
          </Button>
        </form>
      </Card>
    </div>
  );
}
