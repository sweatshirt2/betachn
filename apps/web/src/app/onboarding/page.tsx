'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch } from 'react-redux';
import { setDeviceSession } from '@/store';
import { Button, Card, Field, AuthArt } from '@/components/ui';
import { LANGUAGE_STORAGE_KEY, LOCALES, type Locale } from '@/i18n/dictionaries';
import {
  addLocalPerson,
  createLocalHousehold,
  localRoleMap,
  openBrowserDevice,
} from '@/lib/device';
import { permissionMapFor } from '@chorify/core/permissions';
import * as schema from '@chorify/local-db/schema';
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
  const dispatch = useDispatch();
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
      let deviceSession: {
        household: { id: string; name: string; code: string };
        activePerson: { id: string; name: string };
        permissionMap: Record<string, boolean>;
      } | null = null;
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
        // Resolve the owner's permissionMap from the cloned owner role.
        const roleRows = await device.db.select().from(schema.roles);
        const peopleRows = await device.db.select().from(schema.people);
        const owner = peopleRows.find((p) => p.id === seed.ownerPersonId);
        const ownerRole = owner ? roleRows.find((r) => r.id === owner.roleId) ?? null : null;
        deviceSession = {
          household: { id: seed.householdId, name: householdName.trim(), code: seed.code },
          activePerson: { id: seed.ownerPersonId, name: ownerName.trim() },
          permissionMap: permissionMapFor({
            role: ownerRole
              ? { isOwnerRole: ownerRole.isOwnerRole, permissions: ownerRole.permissions }
              : null,
          }),
        };
      }
      if (deviceSession) dispatch(setDeviceSession(deviceSession));
      router.push('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.loading'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="bg-page-wash ambient mx-auto flex min-h-screen w-full max-w-sm flex-col justify-center px-4 py-10">
      {step === 0 && (
        <div className="page-enter flex flex-col">
          <AuthArt variant="language" />
          <Card className="mt-5">
            <h1 className="font-display text-2xl">{t('onboarding.languageTitle')}</h1>
            <div className="mt-4 flex gap-2">
              {LOCALES.map((locale) => (
                <Button key={locale} tone="quiet" onClick={() => setLocale(locale)}>
                  {locale === 'en' ? 'English' : 'አማርኛ'}
                </Button>
              ))}
            </div>
          </Card>
        </div>
      )}

      {step === 1 && (
        <div className="page-enter flex flex-col">
          <AuthArt variant="household" />
          <Card className="mt-5">
            <h1 className="font-display text-2xl">{t('onboarding.householdTitle')}</h1>
            <p className="text-muted mt-1 text-sm">{t('onboarding.changeLater')}</p>
            <div className="mt-4 flex flex-col gap-3">
              <Field label={t('onboarding.householdName')} value={householdName} onChange={(e) => setHouseholdName(e.target.value)} placeholder={t('onboarding.householdPlaceholder')} />
              <Field label={t('onboarding.yourName')} value={ownerName} onChange={(e) => setOwnerName(e.target.value)} placeholder={t('onboarding.ownerPlaceholder')} />
              <Button disabled={householdName.trim().length === 0 || ownerName.trim().length === 0} onClick={() => setStep(2)}>
                {t('onboarding.continue')}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {step === 2 && (
        <div className="page-enter flex flex-col">
          <AuthArt variant="people" />
          <Card className="mt-5">
          <h1 className="font-display text-2xl">{t('onboarding.addPeople')}</h1>
          <p className="text-muted mt-1 text-sm">{t('onboarding.addPeopleHint')}</p>
          <div className="mt-4 flex flex-col gap-3">
            {people.map((person, index) => (
              <div key={index} className="flex gap-2">
                <input
                  className="bg-surface-alt text-ink border-line shadow-soft focus:border-terracotta focus:ring-terracotta/30 min-w-0 flex-1 rounded-md border px-3 py-2 text-sm outline-none transition-colors focus:ring-2"
                  placeholder="Name"
                  value={person.name}
                  onChange={(e) =>
                    setPeople((current) =>
                      current.map((p, i) => (i === index ? { ...p, name: e.target.value } : p)),
                    )
                  }
                  aria-label={t('onboarding.personNameAria', { index: index + 1 })}
                />
                <select
                  className="bg-surface-alt text-ink border-line shadow-soft focus:border-terracotta focus:ring-terracotta/30 rounded-md border px-2 py-2 text-sm outline-none transition-colors focus:ring-2"
                  value={person.roleKey}
                  onChange={(e) =>
                    setPeople((current) =>
                      current.map((p, i) => (i === index ? { ...p, roleKey: e.target.value } : p)),
                    )
                  }
                  aria-label={t('onboarding.personRoleAria', { index: index + 1 })}
                >
                  {ROLE_OPTIONS.map((key) => (
                    <option key={key} value={key}>
                      {t(`onboarding.role${key.charAt(0).toUpperCase()}${key.slice(1).replace(/_([a-z])/g, (_, c: string) => c.toUpperCase())}`)}
                    </option>
                  ))}
                </select>
              </div>
            ))}
            <Button tone="quiet" onClick={() => setPeople((current) => [...current, { name: '', roleKey: 'child' }])}>
              {t('onboarding.addAnother')}
            </Button>
            {error && (
              <p className="text-clay-red text-sm" role="alert">
                {error}
              </p>
            )}
            <Button disabled={busy} onClick={finish}>
              {busy ? t('onboarding.settingUp') : t('onboarding.start')}
            </Button>
          </div>
          </Card>
        </div>
      )}
    </main>
  );
}
