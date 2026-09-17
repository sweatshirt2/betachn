/**
 * Notification recipient resolver (§4.10 / §6.14) — pure. Six event kinds map
 * to recipients exactly as locked; every result is then filtered through the
 * recipient's notification_prefs category toggles.
 *
 * Category note: supply alerts ride the `reminder` toggle — §4.5's frozen
 * category set has no dedicated bucket and reminder defaults ON (only
 * finance/bill default OFF), which matches "Detergent running low" UX.
 */
export const NOTIFY_CATEGORIES = [
  'assignment',
  'reminder',
  'completion',
  'missed',
  'finance',
  'bill',
  'backup',
] as const;

export type NotifyCategory = (typeof NOTIFY_CATEGORIES)[number];

export type NotifyKind =
  | 'assignment'
  | 'completion'
  | 'missed'
  | 'reminderDigest'
  | 'backup'
  | 'supplyAlert'
  | 'recurringDue';

/** The notification category a kind persists under. */
export const KIND_CATEGORY: Record<NotifyKind, NotifyCategory> = {
  assignment: 'assignment',
  completion: 'completion',
  missed: 'missed',
  reminderDigest: 'reminder',
  backup: 'backup',
  supplyAlert: 'reminder',
  // §4A.3/D108: recurring-buy reminders ride the `reminder` prefs toggle.
  recurringDue: 'reminder',
};

/** Inputs available per emission site; unused members are ignored. */
export interface RecipientContext {
  assigneePersonIds?: readonly string[];
  ruleCreatorPersonId?: string | null;
  /** Holders of the owner-permission role at emission time. */
  ownerPersonIds?: readonly string[];
  /** Holders of resources.manage_supplies at emission time. */
  supplyManagerPersonIds?: readonly string[];
  actorPersonId?: string | null;
}

function unique(ids: readonly string[]): string[] {
  return [...new Set(ids)];
}

function withoutActor(ids: readonly string[], actorPersonId: string | null | undefined): string[] {
  return actorPersonId ? unique(ids).filter((id) => id !== actorPersonId) : unique(ids);
}

/**
 * Recipients before prefs filtering, per §4.10:
 * assignment/digest → assignees · completion/missed → rule creator else
 * owners (minus actor) · backup → owners · supply → manage_supplies (minus actor).
 */
export function resolveRecipients(kind: NotifyKind, ctx: RecipientContext): string[] {
  switch (kind) {
    case 'assignment':
    case 'reminderDigest':
      return unique(ctx.assigneePersonIds ?? []);
    case 'completion':
    case 'missed':
      return withoutActor(
        ctx.ruleCreatorPersonId ? [ctx.ruleCreatorPersonId] : (ctx.ownerPersonIds ?? []),
        ctx.actorPersonId,
      );
    case 'backup':
      return unique(ctx.ownerPersonIds ?? []);
    case 'supplyAlert':
      return withoutActor(ctx.supplyManagerPersonIds ?? [], ctx.actorPersonId);
    case 'recurringDue':
      // D108: creator + manage_shopping holders minus the actor (the sweep
      // has no actor; the minus-actor branch matters only for the device job).
      return withoutActor(
        [
          ...(ctx.ruleCreatorPersonId ? [ctx.ruleCreatorPersonId] : []),
          ...(ctx.supplyManagerPersonIds ?? []),
        ],
        ctx.actorPersonId,
      );
  }
}

/** Partial per-person toggles as persisted in notification_prefs.categories. */
export type PrefToggles = Partial<Record<NotifyCategory, boolean>>;


/**
 * Filters recipients through their own prefs rows. `prefsFor` returns the
 * person's stored partial toggles (or null when no row exists).
 */
/** Absent toggle ⇒ the default matrix; only finance/bill start OFF (§4.5). */
const CATEGORY_DEFAULTS: Record<NotifyCategory, boolean> = {
  assignment: true,
  reminder: true,
  completion: true,
  missed: true,
  finance: false,
  bill: false,
  backup: true,
};

/** Full default toggle set for preferences UI (absent row ⇒ these). */
export function defaultPrefToggles(): Record<NotifyCategory, boolean> {
  return { ...CATEGORY_DEFAULTS };
}

export function categoryAllowed(
  category: NotifyCategory,
  prefs: PrefToggles | null | undefined,
): boolean {
  return prefs?.[category] ?? CATEGORY_DEFAULTS[category];
}

export function filterByPrefs(
  recipients: readonly string[],
  kind: NotifyKind,
  prefsFor: (personId: string) => PrefToggles | null | undefined,
): string[] {
  const category = KIND_CATEGORY[kind];
  return recipients.filter((personId) => categoryAllowed(category, prefsFor(personId)));
}
