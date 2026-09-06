'use client';

import { Button, Card, Chip } from '@/components/ui';
import { THEME_IDS, THEME_LABELS, useTheme } from '@/theme';

const MOCK_CHORES = [
  { emoji: '🧺', title: 'Laundry', assignee: 'Hana', recurring: true },
  { emoji: '🗑️', title: 'Take out the trash', assignee: 'Daniel', recurring: true },
  { emoji: '🍳', title: 'Clean kitchen', assignee: 'Up for grabs', recurring: false },
] as const;

export default function ThemePreview() {
  const { theme, setTheme } = useTheme();

  return (
    <main className="bg-cream text-ink mx-auto w-full max-w-3xl p-6">
      <h1 className="font-display text-3xl">Theme preview</h1>
      <p className="text-muted mt-1 text-sm">
        Static mocks only — no database. Edit <code>styles/tokens.css</code> and watch this page
        re-skin.
      </p>

      <div className="mt-4 flex gap-2" role="group" aria-label="Theme">
        {THEME_IDS.map((id) => (
          <Button
            key={id}
            tone={theme === id ? 'primary' : 'quiet'}
            onClick={() => setTheme(id)}
            aria-pressed={theme === id}
          >
            {THEME_LABELS[id]}
          </Button>
        ))}
      </div>

      <section className="mt-6">
        <h2 className="font-display text-xl">Today (mock)</h2>
        <div className="mt-2 flex flex-col gap-3">
          {MOCK_CHORES.map((chore) => (
            <Card key={chore.title} className="flex items-center gap-3">
              <span className="text-2xl" aria-hidden>
                {chore.emoji}
              </span>
              <div className="flex-1">
                <p className="font-semibold">{chore.title}</p>
                <p className="text-muted text-xs">{chore.assignee}</p>
              </div>
              {chore.recurring && <Chip>↻ weekly</Chip>}
              <Button tone="quiet" aria-label={`Complete ${chore.title}`}>
                ✓
              </Button>
            </Card>
          ))}
        </div>
      </section>

      <section className="mt-6">
        <h2 className="font-display text-xl">Attention (mock)</h2>
        <Card className="mt-2 flex items-center gap-3">
          <span className="text-2xl" aria-hidden>
            🧴
          </span>
          <div className="flex-1">
            <p className="font-semibold">Detergent</p>
            <p className="text-xs">
              <Chip tone="warning">Running low</Chip>
            </p>
          </div>
          <Button>Add to shopping</Button>
        </Card>
        <div className="mt-3 flex flex-wrap gap-2">
          <Chip tone="success">Available</Chip>
          <Chip tone="danger">Missed · 2</Chip>
          <Chip tone="info">Coming up</Chip>
        </div>
      </section>

      <section className="mt-6">
        <h2 className="font-display text-xl">Surfaces</h2>
        <div className="mt-2 grid grid-cols-2 gap-3">
          <div
            className="rounded-lg p-4 shadow-lift"
            style={{ background: 'var(--chorify-gradient-dawn)' }}
          >
            <p className="font-semibold">Dawn gradient</p>
            <p className="text-muted text-xs">lift shadow</p>
          </div>
          <div
            className="rounded-lg p-4 shadow-lift"
            style={{ background: 'var(--chorify-gradient-ember)', color: 'var(--chorify-primary-ink)' }}
          >
            <p className="font-semibold">Ember gradient</p>
            <p className="text-xs opacity-80">primary ink text</p>
          </div>
        </div>
      </section>
    </main>
  );
}
