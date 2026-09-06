'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Card, Field } from '@/components/ui';
import { LANGUAGE_STORAGE_KEY, LOCALES, type Locale } from '@/i18n/dictionaries';
import {
  addLocalPerson,
  createLocalHousehold,
  localRoleMap,
  openBrowserDevice,
} from '@/lib/device';
import i18n from '@/i18n';

type DraftPerson = { name: string; roleKey: string };

const ROLE_OPTIONS = [
  'mother',
  'father',
  'guardian',
  'adult',
  'teenager',
  'responsible_child',
  'child',
  'supervised_child',
  'family_member',
];

/**
 * One-minute onboarding (§5.5, offline-first D49): language → household +
 * yourself → people → finish. Writes land in the DEVICE database — no
 * account, no server contact. Starter-chore templates arrive with the
 * Chores create screen (ledger).
 */
export default function OnboardingPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [step, setStep] = useState(0);
  const [householdName, setHouseholdName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [people, setPeople] = useState<DraftPerson[]>([{ name: '', roleKey: 'child' }]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function setLocale(locale: Locale) {
    void i18n.changeLanguage(locale);
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, locale);
    } catch {
      // Non-fatal — language still applies for this session.
    }
    setStep(1);
  }

  async function finish() {
    setBusy(true);
    setError(null);
    try {
      const seed = await createLocalHousehold({ householdName, ownerName });
      const device = await openBrowserDevice();
      if (device.db !== null) {
        const roleMap = await localRoleMap(device.db, seed.householdId);
        for (const person of people) {
          if (person.name.trim().length === 0) continue;
          await addLocalPerson(device.db, {
            householdId: seed.householdId,
            name: person.name,
            roleId: roleMap[person.roleKey] ?? null,
          });
        }
      }
      router.push('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.loading'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-sm flex-col justify-center px-4">
      {step === 0 && (
        <Card>
          <h1 className="font-display text-2xl">Language / ቋንቋ</h1>
          <div className="mt-4 flex gap-2">
            {LOCALES.map((locale) => (
              <Button key={locale} tone="quiet" onClick={() => setLocale(locale)}>
                {locale === 'en' ? 'English' : 'አማርኛ'}
              </Button>
            ))}
          </div>
        </Card>
      )}

      {step === 1 && (
        <Card>
          <h1 className="font-display text-2xl">Your household</h1>
          <p className="text-muted mt-1 text-sm">You can change this later.</p>
          <div className="mt-4 flex flex-col gap-3">
            <Field label="Household name" value={householdName} onChange={(e) => setHouseholdName(e.target.value)} placeholder="Bekele Family" />
            <Field label="Your name" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} placeholder="Hana" />
            <Button disabled={householdName.trim().length === 0 || ownerName.trim().length === 0} onClick={() => setStep(2)}>
              Continue
            </Button>
          </div>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <h1 className="font-display text-2xl">Add people</h1>
          <p className="text-muted mt-1 text-sm">Anyone can be added later too.</p>
          <div className="mt-4 flex flex-col gap-3">
            {people.map((person, index) => (
              <div key={index} className="flex gap-2">
                <input
                  className="bg-surface text-ink border-line min-w-0 flex-1 rounded-md border px-3 py-2 text-sm"
                  placeholder="Name"
                  value={person.name}
                  onChange={(e) =>
                    setPeople((current) =>
                      current.map((p, i) => (i === index ? { ...p, name: e.target.value } : p)),
                    )
                  }
                  aria-label={`Person ${index + 1} name`}
                />
                <select
                  className="bg-surface text-ink border-line rounded-md border px-2 py-2 text-sm"
                  value={person.roleKey}
                  onChange={(e) =>
                    setPeople((current) =>
                      current.map((p, i) => (i === index ? { ...p, roleKey: e.target.value } : p)),
                    )
                  }
                  aria-label={`Person ${index + 1} role`}
                >
                  {ROLE_OPTIONS.map((key) => (
                    <option key={key} value={key}>
                      {key.replace(/_/g, ' ')}
                    </option>
                  ))}
                </select>
              </div>
            ))}
            <Button tone="quiet" onClick={() => setPeople((current) => [...current, { name: '', roleKey: 'child' }])}>
              + Add another
            </Button>
            {error && (
              <p className="text-clay-red text-sm" role="alert">
                {error}
              </p>
            )}
            <Button disabled={busy} onClick={finish}>
              {busy ? 'Setting up…' : 'Start'}
            </Button>
          </div>
        </Card>
      )}
    </main>
  );
}
