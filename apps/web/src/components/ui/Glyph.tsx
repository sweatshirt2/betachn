/**
 * Glyph — the emoji replacement family (UI/UX iteration 1).
 *
 * Minimalist 2px-stroke SVGs in the same hand-drawn language as NavIcon
 * (24px grid, round caps, pure currentColor) so every glyph re-skins with
 * all six themes automatically. System chrome never wears emojis — only
 * user-chosen identity avatars do (§8).
 */
import type { SVGProps } from 'react';

export type GlyphName =
  // chore categories
  | 'trash'
  | 'dishes'
  | 'laundry'
  | 'cleaning'
  | 'cooking'
  | 'basket'
  // supplies
  | 'bottle'
  | 'grain'
  | 'coffee'
  | 'jar'
  // shopping
  | 'cart'
  // empty-state art + toasts + misc
  | 'sparkle'
  | 'bell'
  | 'door'
  | 'cloud'
  | 'scroll'
  | 'printer'
  | 'people'
  | 'shield'
  | 'check-circle'
  | 'alert'
  | 'info'
  | 'camera'
  | 'repeat'
  // emoji-replacement batch (UI iteration 3)
  | 'pin'
  | 'plant'
  | 'water'
  | 'gear'
  | 'lock'
  | 'wrench'
  | 'masks'
  | 'skip'
  | 'close'
  | 'sun'
  | 'grip';

const strokeProps = {
  stroke: 'currentColor',
  strokeWidth: 1.9,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  fill: 'none',
} as const;

const PATHS: Record<GlyphName, React.ReactNode> = {
  trash: (
    <>
      <path d="M4.8 7h14.4" />
      <path d="M9.4 7V5.4a1.6 1.6 0 0 1 1.6-1.6h2a1.6 1.6 0 0 1 1.6 1.6V7" />
      <path d="M6.4 7l1 11.2a2 2 0 0 0 2 1.8h5.2a2 2 0 0 0 2-1.8L17.6 7" />
      <path d="M10.2 10.6v5.4M13.8 10.6v5.4" />
    </>
  ),
  dishes: (
    <>
      <circle cx="12" cy="12" r="8.2" />
      <circle cx="12" cy="12" r="4.4" />
    </>
  ),
  laundry: (
    <>
      <path d="M8.6 4.4 5 6.6l1.6 3.4 2-.9V19a1.6 1.6 0 0 0 1.6 1.6h3.6A1.6 1.6 0 0 0 15.4 19V9.1l2 .9L19 6.6l-3.6-2.2a3.4 3.4 0 0 1-6.8 0Z" />
    </>
  ),
  cleaning: (
    <>
      <path d="M14.8 3.6 10 14" />
      <path d="M10 14l-3.4 1.2a1.6 1.6 0 0 0-1 2l.8 2.4 8.2-2.8-.8-2.4a1.6 1.6 0 0 0-2-1L10 14Z" />
      <path d="M7.4 17.6l6.2-2.1" />
    </>
  ),
  cooking: (
    <>
      <path d="M5.4 10.4h13.2l-.8 7a2 2 0 0 1-2 1.8H8.2a2 2 0 0 1-2-1.8l-.8-7Z" />
      <path d="M3.6 10.4h16.8" />
      <path d="M12 7.4v-.8" />
      <path d="M8.4 8.6a3.8 3.8 0 0 1 7.2 0" />
    </>
  ),
  basket: (
    <>
      <path d="M4.6 9.4h14.8l-1.5 8.6a2 2 0 0 1-2 1.6H8.1a2 2 0 0 1-2-1.6L4.6 9.4Z" />
      <path d="M8.6 9.2 12 3.8l3.4 5.4" />
      <path d="M9.4 12.6l.7 3.8M14.6 12.6l-.7 3.8" />
    </>
  ),
  bottle: (
    <>
      <path d="M10 3.4h4" />
      <path d="M10.6 3.4v3.2l-1.8 2.2a3 3 0 0 0-.6 1.8v8a2 2 0 0 0 2 2h3.6a2 2 0 0 0 2-2v-8a3 3 0 0 0-.6-1.8l-1.8-2.2V3.4" />
      <path d="M8.6 13.4h6.8" />
    </>
  ),
  grain: (
    <>
      <path d="M8.6 7.4c-1.6 1.8-2.6 4.2-2.6 6.8 0 3.4 2.4 6.2 6 6.2s6-2.8 6-6.2c0-2.6-1-5-2.6-6.8" />
      <path d="M8.6 7.4h6.8" />
      <path d="M9.4 7.2 12 3.8l2.6 3.4" />
      <path d="M12 11v4" />
    </>
  ),
  coffee: (
    <>
      <path d="M5.4 9.4h11.2v6.4a4 4 0 0 1-4 4H9.4a4 4 0 0 1-4-4V9.4Z" />
      <path d="M16.6 10.6h1.6a2.2 2.2 0 0 1 0 4.4h-1.6" />
      <path d="M8.6 3.8c-.6 1 .6 1.6 0 2.6M12.2 3.8c-.6 1 .6 1.6 0 2.6" />
    </>
  ),
  jar: (
    <>
      <rect x="6.6" y="3.8" width="10.8" height="3" rx="1" />
      <path d="M8 6.8v11.4a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2V6.8" />
      <path d="M8.6 11.4h6.8" />
    </>
  ),
  cart: (
    <>
      <path d="M3.6 4.6h2.2l2 10.6a1.8 1.8 0 0 0 1.8 1.4h7.6a1.8 1.8 0 0 0 1.8-1.4l1.4-7H6.4" />
      <circle cx="10.2" cy="19.8" r="1.4" />
      <circle cx="16.6" cy="19.8" r="1.4" />
    </>
  ),
  sparkle: (
    <>
      <path d="M12 3.6c.7 4.6 2 5.9 6.6 6.6-4.6.7-5.9 2-6.6 6.6-.7-4.6-2-5.9-6.6-6.6 4.6-.7 5.9-2 6.6-6.6Z" />
      <path d="M18.4 15.4c.3 2 1 2.7 3 3-2 .3-2.7 1-3 3-.3-2-1-2.7-3-3 2-.3 2.7-1 3-3Z" />
    </>
  ),
  bell: (
    <>
      <path d="M12 3.4a5.8 5.8 0 0 1 5.8 5.8c0 4.1 1.1 5.6 1.9 6.6H4.3c.8-1 1.9-2.5 1.9-6.6A5.8 5.8 0 0 1 12 3.4Z" />
      <path d="M9.9 18.6a2.2 2.2 0 0 0 4.2 0" />
    </>
  ),
  door: (
    <>
      <path d="M12 3.6 4.6 8v12.4h14.8V8L12 3.6Z" />
      <path d="M9.8 20.4v-6.2h4.4v6.2" />
    </>
  ),
  cloud: (
    <>
      <path d="M7.2 18.4a4 4 0 0 1-.6-8 5.4 5.4 0 0 1 10.4-1.2 4.2 4.2 0 0 1-.8 9.2H7.2Z" />
      <path d="M12 10.6v3" />
      <path d="M12 16.2v.2" />
    </>
  ),
  scroll: (
    <>
      <path d="M6.4 4.4h11.2a2 2 0 0 1 2 2v11.2a2 2 0 0 1-2 2H6.4a2 2 0 0 1-2-2V6.4a2 2 0 0 1 2-2Z" />
      <path d="M8.4 9h7.2M8.4 12.4h7.2M8.4 15.8h4.4" />
    </>
  ),
  printer: (
    <>
      <path d="M7.4 8.4V4.6h9.2v3.8" />
      <rect x="4.2" y="8.4" width="15.6" height="7.4" rx="1.8" />
      <path d="M7.4 13.4h9.2v6H7.4z" />
      <path d="M16.8 11h.2" />
    </>
  ),
  people: (
    <>
      <circle cx="9.2" cy="8.6" r="3.4" />
      <path d="M3.4 19a5.9 5.9 0 0 1 11.6 0" />
      <circle cx="16.8" cy="9.6" r="2.4" />
      <path d="M16 15.4a4.4 4.4 0 0 1 4.6 3.4" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3.6 5.4 6v5.2c0 4.4 2.8 7.4 6.6 9.2 3.8-1.8 6.6-4.8 6.6-9.2V6L12 3.6Z" />
      <path d="M9.2 11.8l2 2 3.6-3.8" />
    </>
  ),
  'check-circle': (
    <>
      <circle cx="12" cy="12" r="8.4" />
      <path d="M8.4 12.2l2.4 2.4 4.8-5" />
    </>
  ),
  alert: (
    <>
      <path d="M12 4.2 3.4 19h17.2L12 4.2Z" />
      <path d="M12 10v4" />
      <path d="M12 16.6v.2" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="8.4" />
      <path d="M12 11v5" />
      <path d="M12 7.6v.2" />
    </>
  ),
  camera: (
    <>
      <path d="M4 8.5A2.5 2.5 0 0 1 6.5 6h1.2a2 2 0 0 0 1.7-.95l.5-.8a1 1 0 0 1 .85-.47h2.5a1 1 0 0 1 .85.47l.5.8A2 2 0 0 0 16.3 6h1.2A2.5 2.5 0 0 1 20 8.5v8A2.5 2.5 0 0 1 17.5 19h-11A2.5 2.5 0 0 1 4 16.5Z" />
      <circle cx="12" cy="12.5" r="3.4" />
    </>
  ),
  repeat: (
    <>
      <path d="M17.5 5.5H8a4 4 0 0 0-4 4v.8" />
      <path d="M15 3l2.8 2.6L15 8.2" />
      <path d="M6.5 18.5H16a4 4 0 0 0 4-4v-.8" />
      <path d="M9 21l-2.8-2.6L9 15.8" />
    </>
  ),
  pin: (
    <>
      <path d="M12 3.6a3.4 3.4 0 0 1 3.4 3.4c0 2.4-3.4 6.6-3.4 6.6s-3.4-4.2-3.4-6.6A3.4 3.4 0 0 1 12 3.6Z" />
      <path d="M12 7h.02" />
      <path d="M12 13.6V20.4" />
    </>
  ),
  plant: (
    <>
      <path d="M12 20.4v-6.8" />
      <path d="M12 13.6c0-3.2-2.4-5.6-5.8-5.8.2 3.4 2.6 5.8 5.8 5.8Z" />
      <path d="M12 11.4c0-2.8 2.2-5 5.4-5.2-.2 3-2.4 5.2-5.4 5.2Z" />
      <path d="M7.4 20.4h9.2" />
    </>
  ),
  water: (
    <>
      <path d="M12 3.6s6.2 6.4 6.2 10.4a6.2 6.2 0 0 1-12.4 0C5.8 10 12 3.6 12 3.6Z" />
      <path d="M9.4 13.6a2.8 2.8 0 0 0 2.6 2.6" />
    </>
  ),
  gear: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 4.4v2M12 17.6v2M4.4 12h2M17.6 12h2M6.5 6.5l1.4 1.4M16.1 16.1l1.4 1.4M17.5 6.5l-1.4 1.4M7.9 16.1l-1.4 1.4" />
    </>
  ),
  lock: (
    <>
      <rect x="5.6" y="10.6" width="12.8" height="9" rx="2" />
      <path d="M8.6 10.6V7.8a3.4 3.4 0 0 1 6.8 0v2.8" />
      <path d="M12 14.4v1.8" />
    </>
  ),
  wrench: (
    <>
      <path d="M14.8 6.2a4 4 0 0 1 4.4-1l-2.9 2.9 1.6 1.6 2.9-2.9a4 4 0 0 1-5.4 5L8.2 19a2.2 2.2 0 0 1-3.2-3.2l7.2-7.2a4 4 0 0 1 2.6-2.4Z" />
    </>
  ),
  masks: (
    <>
      <path d="M4.6 6.4h7v6.2a3.5 3.5 0 0 1-7 0Z" />
      <path d="M12.4 6.4h7v6.2a3.5 3.5 0 0 1-7 0Z" />
      <path d="M6.4 9h3.4M14.2 9h3.4" />
    </>
  ),
  skip: (
    <>
      <path d="M5.4 5.4 18.6 18.6" />
      <path d="M18.6 8.4l3-3M18.6 8.4l-3-3" />
      <path d="M5.4 12.6v6h6" />
    </>
  ),
  close: (
    <>
      <path d="M6.4 6.4 17.6 17.6" />
      <path d="M17.6 6.4 6.4 17.6" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 3.2v2M12 18.8v2M3.2 12h2M18.8 12h2M5.8 5.8l1.4 1.4M16.8 16.8l1.4 1.4M18.2 5.8l-1.4 1.4M7.2 16.8l-1.4 1.4" />
    </>
  ),
  grip: (
    <>
      <path d="M9.2 6.4v.2M14.8 6.4v.2M9.2 12v.2M14.8 12v.2M9.2 17.6v.2M14.8 17.6v.2" />
    </>
  ),
};

/** Stroke glyph — system chrome's emoji replacement; ink follows currentColor. */
export function Glyph({ name, ...rest }: { name: GlyphName } & SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden {...strokeProps} {...rest}>
      {PATHS[name]}
    </svg>
  );
}

/* ── Category mappers: content decides its glyph ─────────────────────────── */

const CHORE_RULES: Array<[RegExp, GlyphName]> = [
  [/trash|garbage|bin|waste|recycl|መጣጥ|ቆሻሻ|አጓሮት/i, 'trash'],
  [/dish|plate|wash.*dish|kitchen.*clean|ጸዳ|ስሪ|ፕሌት/i, 'dishes'],
  [/laundry|cloth|wash.*(cloth|machine)|iron|ልብስ|ማጠቢያ|ብርጭቆ/i, 'laundry'],
  [/sweep|mop|dust|clean|tidy|vacuum|መጥረብ|አጸዳ|አጽዳ|እንፋሎ/i, 'cleaning'],
  [/cook|meal|food|dinner|lunch|breakfast|kitchen|ምግብ|ቅረብ|አብላ|ማብሰል/i, 'cooking'],
];

/** Chore title → category glyph (keyword match, EN + AM), basket fallback. */
export function choreGlyph(title: string): GlyphName {
  for (const [pattern, glyph] of CHORE_RULES) {
    if (pattern.test(title)) return glyph;
  }
  return 'basket';
}

/**
 * Legacy `responsibility.icon` values are emoji strings from the pre-Glyph
 * era (and new ones are GlyphName from the composer picker). Map any emoji
 * legacy value to its intuitive glyph; unknown values fall back to the
 * title-keyword match so hand-drawn icons survive the migration.
 */
const LEGACY_ICON_RULES: Array<[RegExp, GlyphName]> = [
  [/📌|pin|location|place/i, 'pin'],
  [/🧺|basket|laundry|hamper/i, 'basket'],
  [/🍳|cooking|kitchen|meal|food/i, 'cooking'],
  [/🗑|trash|garbage|bin|waste/i, 'trash'],
  [/🧹|clean|sweep|mop|dust/i, 'cleaning'],
  [/🪴|plant|garden|water(?!.*drop)|flower/i, 'plant'],
  [/🛒|cart|shop|grocer/i, 'cart'],
  [/💧|water|drop/i, 'water'],
  [/🏠|home|house/i, 'door'],
  [/🔧|wrench|fix|repair|maintenance/i, 'wrench'],
  [/🌅|sun|dawn|morning|routine/i, 'sun'],
  [/🧴|bottle|soap|supply/i, 'bottle'],
  [/🎭|role|masks/i, 'masks'],
  [/🔔|bell|notif/i, 'bell'],
  [/⚙|gear|setting/i, 'gear'],
  [/🙂|😊|😀|face|smile|person/i, 'people'],
];

/** Stored chore icon (emoji legacy or GlyphName) → glyph to render. */
export function storedIconGlyph(icon: string | null | undefined, title: string): GlyphName {
  if (icon) {
    if ((PATHS as Record<string, unknown>)[icon as GlyphName] !== undefined) return icon as GlyphName;
    for (const [pattern, glyph] of LEGACY_ICON_RULES) {
      if (pattern.test(icon)) return glyph;
    }
  }
  return choreGlyph(title);
}

const SUPPLY_RULES: Array<[RegExp, GlyphName]> = [
  [/detergent|soap|shampoo|cleaner|bleach|ሳሙና|ሶፕ|የልብስ|ማጽዳት/i, 'bottle'],
  [/rice|flour|teff|berbere|sugar|salt|grain|pasta|ሩዝ|ዱቄት|ባቄላ|ብርበሬ|ስኳር|ጨው/i, 'grain'],
  [/coffee|tea|ቡና|ሻይ/i, 'coffee'],
];

/** Supply name → glyph (keyword match, EN + AM), jar fallback. */
export function supplyGlyph(name: string): GlyphName {
  for (const [pattern, glyph] of SUPPLY_RULES) {
    if (pattern.test(name)) return glyph;
  }
  return 'jar';
}
