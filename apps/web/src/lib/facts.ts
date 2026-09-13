/**
 * Person identity fact-tag builder (§5.5): renders as "12 · girl", "boy",
 * or "12" — whatever the person carries. When a birthDate exists, age is
 * derived from it (live, never stale); otherwise the stored fallback age
 * (§6.9 "stored only when birthDate unknown") is shown. Returns null when
 * the person carries nothing — cards simply omit the tag.
 */
import type { TFunction } from 'i18next';

export function personAge(person: { birthDate: string | null; age: number | null }): number | null {
  if (person.birthDate) {
    const birth = new Date(`${person.birthDate}T00:00:00`);
    if (!Number.isNaN(birth.getTime())) {
      const now = new Date();
      let years = now.getFullYear() - birth.getFullYear();
      const beforeBirthday =
        now.getMonth() < birth.getMonth() ||
        (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate());
      if (beforeBirthday) years -= 1;
      return years >= 0 && years < 130 ? years : null;
    }
  }
  return person.age ?? null;
}

export function personFactsTag(
  person: { birthDate: string | null; age: number | null; sex: 'male' | 'female' | null },
  t: TFunction<'translation'>,
): string | null {
  const age = personAge(person);
  // Girl/Boy for minors, Woman/Man once adult — "· Girl" on a 24-year-old
  // read wrong (UI/UX iteration 1). Without a known age the word stays
  // neutral (facts.male/female) rather than guessing.
  const minor = age !== null && age < 18;
  const gender =
    person.sex === 'female'
      ? minor
        ? t('facts.female')
        : t('facts.femaleAdult')
      : person.sex === 'male'
        ? minor
          ? t('facts.male')
          : t('facts.maleAdult')
        : null;
  if (age !== null && gender !== null) return `${age} · ${gender}`;
  if (age !== null) return String(age);
  return gender;
}
