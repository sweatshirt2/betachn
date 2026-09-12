/**
 * Person identity fact-tag builder (§5.5): renders as "12 · girl", "boy",
 * or "12" — whatever the person carries. When a birthDate exists, age is
 * derived from it (live, never stale); otherwise the stored fallback age
 * (§6.9 "stored only when birthDate unknown") is shown. Returns null when
 * the person carries nothing — cards simply omit the tag.
 */

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
  t: (key: string) => string,
): string | null {
  const age = personAge(person);
  const gender = person.sex === 'female' ? t('facts.female') : person.sex === 'male' ? t('facts.male') : null;
  if (age !== null && gender !== null) return `${age} · ${gender}`;
  if (age !== null) return String(age);
  return gender;
}
