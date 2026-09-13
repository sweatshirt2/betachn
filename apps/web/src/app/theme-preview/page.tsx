'use client';

import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { Button, Card, Chip, ChoreCheck, TaskActionRow, TaskDoneRow, TaskUpcomingRow, ThemeSwatch, crayon } from '@/components/ui';
import { THEME_IDS, THEME_LABELS, useTheme } from '@/theme';

/**
 * Living styleguide (§5.2): every primitive against the live theme, plus
 * one-click theme switching for the six-pastel experiment.
 */
export default function ThemePreviewPage() {
  const { t } = useTranslation();
  const { theme, setTheme } = useTheme();

  return (
    <main className="mx-auto w-full max-w-3xl p-6">
      <h1 className="font-display text-3xl">{t('themePreview.title')}</h1>
      <p className="text-muted mt-1 text-sm">{t('themePreview.subtitle')}</p>

      <section aria-label={t('themePreview.themes')} className="mt-5">
        <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-6">
          {THEME_IDS.map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => setTheme(id)}
              aria-pressed={theme === id}
              className={`lift-hover bg-card-wash rounded-md border p-1.5 text-left ${
                theme === id ? 'border-terracotta ring-terracotta/40 shadow-soft ring-2' : 'border-line hover:shadow-soft'
              }`
              }
            >
              <ThemeSwatch theme={id} />
              <span className={`mt-1 block px-0.5 text-xs font-bold ${theme === id ? 'text-ink' : 'text-muted'}`}>
                {THEME_LABELS[id]}
              </span>
            </button>
          ))}
        </div>
      </section>

      <section aria-label={t('themePreview.surfaces')} className="mt-8">
        <h2 className="font-display text-xl">{t('themePreview.surfaces')}</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Card>
            <p className="font-semibold">Card</p>
            <p className="text-muted text-sm">{t('themePreview.cardWash')}</p>
          </Card>
          <Card className="bg-accent-wash">
            <p className="font-semibold">Accent wash</p>
            <p className="text-muted text-sm">{t('themePreview.cardWash')}</p>
          </Card>
          <div className="bg-primary-wash shadow-soft rounded-lg p-4">
            <p className="font-semibold">Primary wash</p>
            <p className="text-sm opacity-80">{t('themePreview.cardWash')}</p>
          </div>
          <div className="bg-wash border-line/60 rounded-lg border p-4">
            <p className="font-semibold">Done wash</p>
            <p className="text-muted text-sm">{t('themePreview.cardWash')}</p>
          </div>
        </div>
      </section>

      <section aria-label={t('themePreview.actions')} className="mt-8">
        <h2 className="font-display text-xl">{t('themePreview.actions')}</h2>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Button>Primary</Button>
          <Button tone="quiet">Quiet</Button>
          <ChoreCheck done={false} onClick={() => {}} label="demo" />
          <ChoreCheck done={true} onClick={() => {}} label="demo done" />
          <Chip>Default</Chip>
          <Chip tone="success">Success</Chip>
          <Chip tone="warning">Warning</Chip>
          <Chip tone="info">Info</Chip>
          <Chip tone="danger">Danger</Chip>
        </div>
      </section>

      <section aria-label={t('themePreview.tasks')} className="mt-8">
        <h2 className="font-display text-xl">{t('themePreview.tasks')}</h2>
        <div className="mt-3 flex flex-col gap-2">
          <TaskActionRow title="Water the plants" meta="Sami" accent={crayon(0)} action={<ChoreCheck done={false} onClick={() => {}} label="demo" />} />
          <TaskActionRow title="Fold laundry" meta="Hana" accent={crayon(1)} action={<ChoreCheck done={true} onClick={() => {}} label="demo" />} />
          <TaskDoneRow title="Math homework checked" meta="Done · 4:20pm" />
          <TaskUpcomingRow title="Bike maintenance" meta="Sat" />
        </div>
      </section>

      <p className="text-muted mt-8 text-center text-sm">
        <Link href="/" className="text-terracotta font-semibold">
          {t('themePreview.backToApp')}
        </Link>
      </p>
    </main>
  );
}
