'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { Button, Card, Field } from '@/components/ui';
import { useCreateResponsibility, usePeopleMap } from '@/features/chores';
import {
  buildRuleInput,
  previewDates,
  WEEKDAYS,
  type ComposerPattern,
  type ComposerRule,
} from '@/features/chores/chores.helpers';
import { hasSession, type RootState } from '@/store';

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

const PATTERN_OPTIONS: ComposerPattern[] = [
  'once',
  'daily',
  'every_n_days',
  'weekly',
  'every_n_weeks',
  'monthly',
  'range',
];

const ICONS = ['📌', '🧺', '🍳', '🗑️', '🧹', '🪴', '🛒', '💧'] as const;

function defaultRule(today: string): ComposerRule {
  return {
    pattern: 'daily',
    startDate: today,
    endDate: null,
    interval: 2,
    daysOfWeek: [1, 3, 5],
    monthDay: 1,
    assignment: { mode: 'fixed', personIds: [] },
  };
}

const inputClass =
  'bg-surface-alt text-ink border-line shadow-soft outline-none transition-colors focus:border-terracotta focus:ring-2 focus:ring-terracotta/30 mt-1 w-full rounded-md border px-3 py-2 text-sm';

/** Chore composer (§5.5): full pattern picker + rotation builder + subtasks. */
export default function NewChorePage() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useSearchParams();
  const auth = useSelector((state: RootState) => state.auth);
  const create = useCreateResponsibility();
  const people = usePeopleMap();

  // Assign-again prefill (CN micro-29): /chores/new?title=…&icon=…&pattern=once&start=…
  const prefillTitle = params.get('title') ?? '';
  const prefillIcon = params.get('icon') ?? '📌';
  const prefillPattern = params.get('pattern');
  const prefillStart = params.get('start');

  const [title, setTitle] = useState(prefillTitle);
  const [icon, setIcon] = useState<string>(prefillIcon);
  const [subtasks, setSubtasks] = useState<string[]>([]);
  const [rule, setRule] = useState<ComposerRule>(() => ({
    ...defaultRule(todayIso()),
    pattern:
      prefillPattern === 'once' ||
      prefillPattern === 'daily' ||
      prefillPattern === 'weekly' ||
      prefillPattern === 'monthly'
        ? prefillPattern
        : 'daily',
    startDate: prefillStart ?? todayIso(),
  }));

  const today = todayIso();
  const rotation = rule.assignment.mode === 'rotation' ? rule.assignment : null;
  const isRotation = rotation !== null;
  const rotationPeriod = rotation?.periodDays ?? 7;
  const rotationPeople = rotation?.personIds ?? [];

  const nextUp = useMemo(() => previewDates(rule, today), [rule, today]);

  function patchRule(patch: Partial<ComposerRule>) {
    setRule((current) => ({ ...current, ...patch }));
  }

  function togglePerson(id: string) {
    setRule((current) => {
      if (current.assignment.mode !== 'fixed') return current;
      const personIds = current.assignment.personIds.includes(id)
        ? current.assignment.personIds.filter((x) => x !== id)
        : [...current.assignment.personIds, id];
      return { ...current, assignment: { mode: 'fixed', personIds } };
    });
  }

  function toggleRotationPerson(id: string) {
    setRule((current) => {
      if (current.assignment.mode !== 'rotation') return current;
      const personIds = current.assignment.personIds.includes(id)
        ? current.assignment.personIds.filter((x) => x !== id)
        : [...current.assignment.personIds, id];
      return { ...current, assignment: { mode: 'rotation', personIds, periodDays: current.assignment.periodDays } };
    });
  }

  function toggleRotation() {
    setRule((current) => {
      if (current.assignment.mode === 'fixed') {
        return { ...current, assignment: { mode: 'rotation', personIds: current.assignment.personIds, periodDays: 7 } };
      }
      return { ...current, assignment: { mode: 'fixed', personIds: current.assignment.personIds } };
    });
  }

  function toggleDay(day: number) {
    const days = rule.daysOfWeek ?? [];
    patchRule({ daysOfWeek: days.includes(day) ? days.filter((d) => d !== day) : [...days, day].sort() });
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!hasSession(auth)) return;
    try {
      await create.mutateAsync({
        title: title.trim(),
        icon,
        subtasks: subtasks
          .map((s) => s.trim())
          .filter((s) => s.length > 0)
          .map((s) => ({ title: s })),
        rules: [buildRuleInput(rule)],
      });
      router.push('/chores');
    } catch {
      // Validation errors surface via the error envelope; form stays filled.
    }
  }

  return (
    <div className="page-enter">
      <Link href="/chores" className="text-terracotta text-sm font-semibold">
        ← {t('chores.title')}
      </Link>
      <h1 className="font-display mt-1 text-2xl">{t('chores.newChore')}</h1>
      <Card className="mt-3">
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <Field
            label={t('chores.choreTitle')}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t('chores.titlePlaceholder')}
          />

          <fieldset>
            <legend className="text-sm font-semibold">{t('chores.icon')}</legend>
            <div className="mt-1 flex flex-wrap gap-1">
              {ICONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setIcon(emoji)}
                  aria-pressed={icon === emoji}
                  className={`tap-spring rounded-md px-2 py-1 text-xl transition-colors ${icon === emoji ? 'border-terracotta bg-accent-wash shadow-soft border' : 'border-line bg-surface border'}`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="text-sm font-semibold">{t('chores.repeats')}</legend>
            <div className="mt-1 flex flex-wrap gap-1">
              {PATTERN_OPTIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => patchRule({ pattern: option })}
                  aria-pressed={rule.pattern === option}
                  className={`tap-spring rounded-full border px-3 py-1 text-sm font-semibold transition-colors ${rule.pattern === option ? 'border-terracotta bg-accent-wash text-ink shadow-soft' : 'border-line bg-surface text-muted'}`}
                >
                  {t(`chores.${option}`)}
                </button>
              ))}
            </div>

            {(rule.pattern === 'every_n_days' || rule.pattern === 'every_n_weeks') && (
              <label className="mt-2 block text-sm">
                <span className="font-semibold">
                  {rule.pattern === 'every_n_days'
                    ? t('chores.intervalDays', { n: rule.interval ?? 2 })
                    : t('chores.intervalWeeks', { n: rule.interval ?? 2 })}
                </span>
                <input
                  type="number"
                  min={1}
                  max={365}
                  className={inputClass}
                  value={rule.interval ?? 2}
                  onChange={(e) => patchRule({ interval: Math.max(1, Number(e.target.value) || 1) })}
                />
              </label>
            )}

            {(rule.pattern === 'weekly' || rule.pattern === 'every_n_weeks') && (
              <div className="mt-2">
                <span className="text-sm font-semibold">{t('chores.daysOfWeek')}</span>
                <div className="mt-1 flex flex-wrap gap-1">
                  {WEEKDAYS.map((day) => (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggleDay(day)}
                      aria-pressed={(rule.daysOfWeek ?? []).includes(day)}
                      className={`tap-spring rounded-full border px-2 py-1 text-xs font-semibold transition-colors ${(rule.daysOfWeek ?? []).includes(day) ? 'border-terracotta bg-accent-wash text-ink shadow-soft' : 'border-line bg-surface text-muted'}`}
                    >
                      {t(`chores.dow${day}`)}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {rule.pattern === 'monthly' && (
              <label className="mt-2 block text-sm">
                <span className="font-semibold">{t('chores.monthlyDay')}</span>
                <input
                  type="number"
                  min={1}
                  max={31}
                  className={inputClass}
                  value={rule.monthDay ?? 1}
                  onChange={(e) => patchRule({ monthDay: Math.min(31, Math.max(1, Number(e.target.value) || 1)) })}
                />
              </label>
            )}

            <label className="mt-2 block text-sm">
              <span className="font-semibold">{t('chores.startDate')}</span>
              <input
                type="date"
                className={inputClass}
                value={rule.startDate}
                onChange={(e) => patchRule({ startDate: e.target.value || today })}
              />
            </label>

            {rule.pattern === 'range' && (
              <label className="mt-2 block text-sm">
                <span className="font-semibold">{t('chores.endDate')}</span>
                <input
                  type="date"
                  className={inputClass}
                  min={rule.startDate}
                  value={rule.endDate ?? ''}
                  onChange={(e) => patchRule({ endDate: e.target.value || null })}
                />
              </label>
            )}

            {nextUp.length > 0 && (
              <p className="text-muted mt-2 text-sm">
                {t('chores.nextUp')}: {nextUp.join(' · ')}
              </p>
            )}
          </fieldset>

          <fieldset>
            <legend className="text-sm font-semibold">{t('chores.assignedTo')}</legend>
            <div className="mt-1 flex flex-wrap gap-2">
              {(people.data?.people ?? []).map((p) => {
                const selected = isRotation
                  ? rotationPeople.includes(p.id)
                  : rule.assignment.mode === 'fixed' && rule.assignment.personIds.includes(p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => (isRotation ? toggleRotationPerson(p.id) : togglePerson(p.id))}
                    aria-pressed={selected}
                    className={`tap-spring rounded-full border px-3 py-1 text-sm font-semibold transition-colors ${selected ? 'border-terracotta bg-accent-wash text-ink shadow-soft' : 'border-line bg-surface text-muted'}`}
                  >
                    {p.name}
                  </button>
                );
              })}
            </div>

            <label className="mt-3 flex items-center gap-2 text-sm font-semibold">
              <input type="checkbox" checked={isRotation} onChange={toggleRotation} className="accent-terracotta" />
              {t('chores.rotation')}
            </label>
            {isRotation && rotationPeople.length > 1 && (
              <label className="mt-2 block text-sm">
                <span className="font-semibold">
                  {t('chores.rotationPeriod', { n: rotationPeriod })}
                </span>
                <select
                  className={inputClass}
                  value={rotationPeriod}
                  onChange={(e) =>
                    setRule((current) => {
                      if (current.assignment.mode !== 'rotation') return current;
                      return {
                        ...current,
                        assignment: { mode: 'rotation', personIds: current.assignment.personIds, periodDays: Number(e.target.value) },
                      };
                    })
                  }
                >
                  {[1, 2, 3, 7].map((days) => (
                    <option key={days} value={days}>
                      {t('chores.intervalDays', { n: days })}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </fieldset>

          <fieldset>
            <legend className="text-sm font-semibold">{t('chores.steps')}</legend>
            {subtasks.map((step, index) => (
              <div key={index} className="mt-1 flex gap-2">
                <input
                  className={`${inputClass} mt-0`}
                  value={step}
                  placeholder={t('chores.stepPlaceholder')}
                  onChange={(e) =>
                    setSubtasks((current) => current.map((s, i) => (i === index ? e.target.value : s)))
                  }
                />
                <Button
                  type="button"
                  tone="quiet"
                  onClick={() => setSubtasks((current) => current.filter((_, i) => i !== index))}
                  aria-label={`${t('common.remove')} ${index + 1}`}
                >
                  ✕
                </Button>
              </div>
            ))}
            <Button type="button" tone="quiet" className="mt-2" onClick={() => setSubtasks((current) => [...current, ''])}>
              + {t('chores.addStep')}
            </Button>
          </fieldset>

          <Button type="submit" disabled={create.isPending || title.trim().length === 0}>
            {create.isPending ? t('chores.adding') : t('chores.addChore')}
          </Button>
        </form>
      </Card>
    </div>
  );
}
