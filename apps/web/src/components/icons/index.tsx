/**
 * Hand-drawn icon set for Chorify (§5.1 navigation) — two variants each:
 * outline (inactive) and filled (active). Pure `currentColor`, stroke-based
 * geometry with round caps so the set feels soft and toy-like next to the
 * pastel surfaces. 24px viewBox, scales via className.
 */
import type { SVGProps } from 'react';

export type NavIconName =
  | 'today'
  | 'chores'
  | 'household'
  | 'more'
  | 'routines'
  | 'home'
  | 'supplies'
  | 'shopping'
  | 'activity'
  | 'notifications'
  | 'settings'
  | 'owner';

export type IconVariant = 'outline' | 'filled';

type IconProps = SVGProps<SVGSVGElement> & { variant?: IconVariant };

const strokeProps = {
  stroke: 'currentColor',
  strokeWidth: 1.9,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  fill: 'none',
} as const;

const fillProps = {
  fill: 'currentColor',
  stroke: 'none',
} as const;

function TodayIcon({ variant = 'outline', ...rest }: IconProps) {
  return variant === 'filled' ? (
    <svg viewBox="0 0 24 24" {...fillProps} {...rest}>
      <path d="M5 4h14a1.5 1.5 0 0 1 1.5 1.5v13A1.5 1.5 0 0 1 19 20H5a1.5 1.5 0 0 1-1.5-1.5v-13A1.5 1.5 0 0 1 5 4Z" />
      <path d="M4 8.5h16" stroke="#fff" strokeOpacity="0.55" strokeWidth="1.6" />
      <path d="M8.6 13.4l2.3 2.3 4.5-4.6" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" {...strokeProps} {...rest}>
      <rect x="3.8" y="4.2" width="16.4" height="15.6" rx="2.6" />
      <path d="M4.2 8.8h15.6" />
      <path d="M8.4 3.6v3.2M15.6 3.6v3.2" />
      <path d="M8.8 14.2l2.2 2.2 4.2-4.4" />
    </svg>
  );
}

function ChoresIcon({ variant = 'outline', ...rest }: IconProps) {
  return variant === 'filled' ? (
    <svg viewBox="0 0 24 24" {...fillProps} {...rest}>
      <path d="M4.4 8h15.2l-1.5 10.4A2 2 0 0 1 16.1 20H7.9a2 2 0 0 1-2-1.6L4.4 8Z" />
      <path d="M8.5 8V6.6a3.5 3.5 0 0 1 7 0V8" fill="none" stroke="#fff" strokeOpacity="0.55" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" {...strokeProps} {...rest}>
      <path d="M4.4 8.2h15.2l-1.4 10.1a2 2 0 0 1-2 1.7H7.8a2 2 0 0 1-2-1.7L4.4 8.2Z" />
      <path d="M8.6 8.2V6.7a3.4 3.4 0 0 1 6.8 0v1.5" />
    </svg>
  );
}

function HouseholdIcon({ variant = 'outline', ...rest }: IconProps) {
  return variant === 'filled' ? (
    <svg viewBox="0 0 24 24" {...fillProps} {...rest}>
      <circle cx="9.2" cy="8.6" r="3.4" />
      <path d="M3.4 18.8a5.9 5.9 0 0 1 11.6 0v.4H3.4v-.4Z" />
      <circle cx="16.6" cy="9.4" r="2.5" opacity="0.75" />
      <path d="M15.4 18.8a4.6 4.6 0 0 1 5.9-4.2 4.6 4.6 0 0 1 1.3 4.2h-7.2Z" opacity="0.75" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" {...strokeProps} {...rest}>
      <circle cx="9.2" cy="8.6" r="3.4" />
      <path d="M3.4 19a5.9 5.9 0 0 1 11.6 0" />
      <circle cx="16.8" cy="9.6" r="2.4" />
      <path d="M16 15.4a4.4 4.4 0 0 1 4.6 3.4" />
    </svg>
  );
}

function MoreIcon({ variant = 'outline', ...rest }: IconProps) {
  return variant === 'filled' ? (
    <svg viewBox="0 0 24 24" {...fillProps} {...rest}>
      <circle cx="5.4" cy="12" r="2.1" />
      <circle cx="12" cy="12" r="2.1" />
      <circle cx="18.6" cy="12" r="2.1" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" {...strokeProps} {...rest}>
      <circle cx="5.4" cy="12" r="1.9" />
      <circle cx="12" cy="12" r="1.9" />
      <circle cx="18.6" cy="12" r="1.9" />
    </svg>
  );
}

function RoutinesIcon({ variant = 'outline', ...rest }: IconProps) {
  return variant === 'filled' ? (
    <svg viewBox="0 0 24 24" {...fillProps} {...rest}>
      <circle cx="12" cy="12" r="8.4" />
      <path d="M12 6.8V12l3.6 2.2" stroke="#fff" strokeOpacity="0.6" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" {...strokeProps} {...rest}>
      <circle cx="12" cy="12" r="8.4" />
      <path d="M12 6.8V12l3.6 2.2" />
    </svg>
  );
}

function HomeIcon({ variant = 'outline', ...rest }: IconProps) {
  return variant === 'filled' ? (
    <svg viewBox="0 0 24 24" {...fillProps} {...rest}>
      <path d="M4 10.6 12 4l8 6.6V19a1.4 1.4 0 0 1-1.4 1.4h-4.2v-5.2h-4.8v5.2H5.4A1.4 1.4 0 0 1 4 19v-8.4Z" />
      <path d="M9.6 15.2h4.8" stroke="#fff" strokeOpacity="0.5" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" {...strokeProps} {...rest}>
      <path d="M4.2 10.4 12 4l7.8 6.4V19a1.4 1.4 0 0 1-1.4 1.4H5.6A1.4 1.4 0 0 1 4.2 19v-8.6Z" />
      <path d="M9.6 20.2v-5.4h4.8v5.4" />
    </svg>
  );
}

function SuppliesIcon({ variant = 'outline', ...rest }: IconProps) {
  return variant === 'filled' ? (
    <svg viewBox="0 0 24 24" {...fillProps} {...rest}>
      <path d="M8.4 3.4h7.2l-.7 3H9.1l-.7-3Z" opacity="0.85" />
      <rect x="6.4" y="6.4" width="11.2" height="14.2" rx="2.2" />
      <path d="M9.4 11.2h5.2" stroke="#fff" strokeOpacity="0.55" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" {...strokeProps} {...rest}>
      <path d="M8.6 3.6h6.8l-.6 2.8H9.2l-.6-2.8Z" />
      <rect x="6.4" y="6.4" width="11.2" height="14" rx="2.2" />
      <path d="M9.4 10.8h5.2" />
    </svg>
  );
}

function ShoppingIcon({ variant = 'outline', ...rest }: IconProps) {
  return variant === 'filled' ? (
    <svg viewBox="0 0 24 24" {...fillProps} {...rest}>
      <path d="M5 7h14l-1.3 12.2a1.8 1.8 0 0 1-1.8 1.6H8.1a1.8 1.8 0 0 1-1.8-1.6L5 7Z" />
      <path d="M9 9.4V6.4a3 3 0 0 1 6 0v3" fill="none" stroke="#fff" strokeOpacity="0.55" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" {...strokeProps} {...rest}>
      <path d="M5.2 7.2h13.6l-1.2 11.9a1.8 1.8 0 0 1-1.8 1.6H8.2a1.8 1.8 0 0 1-1.8-1.6L5.2 7.2Z" />
      <path d="M9 9.4V6.4a3 3 0 0 1 6 0v3" />
    </svg>
  );
}

function ActivityIcon({ variant = 'outline', ...rest }: IconProps) {
  return variant === 'filled' ? (
    <svg viewBox="0 0 24 24" {...fillProps} {...rest}>
      <path d="M6 3.6h12a1.6 1.6 0 0 1 1.6 1.6v15.2l-3.4-2-3.4 2-3.4-2-3.4 2V5.2A1.6 1.6 0 0 1 6 3.6Z" />
      <path d="M9 9h6M9 12.4h4" stroke="#fff" strokeOpacity="0.55" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" {...strokeProps} {...rest}>
      <path d="M6.2 3.8h11.6a1.4 1.4 0 0 1 1.4 1.4v15l-3.2-1.9-3.2 1.9-3.2-1.9-3.2 1.9v-15a1.4 1.4 0 0 1 1.4-1.4Z" />
      <path d="M9 9h6M9 12.6h4.4" />
    </svg>
  );
}

function NotificationsIcon({ variant = 'outline', ...rest }: IconProps) {
  return variant === 'filled' ? (
    <svg viewBox="0 0 24 24" {...fillProps} {...rest}>
      <path d="M12 3.2a6 6 0 0 1 6 6c0 4.2 1.2 5.8 2 6.8H4c.8-1 2-2.6 2-6.8a6 6 0 0 1 6-6Z" />
      <path d="M9.8 18.6a2.3 2.3 0 0 0 4.4 0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" {...strokeProps} {...rest}>
      <path d="M12 3.4a5.8 5.8 0 0 1 5.8 5.8c0 4.1 1.1 5.6 1.9 6.6H4.3c.8-1 1.9-2.5 1.9-6.6A5.8 5.8 0 0 1 12 3.4Z" />
      <path d="M9.9 18.6a2.2 2.2 0 0 0 4.2 0" />
    </svg>
  );
}

function SettingsIcon({ variant = 'outline', ...rest }: IconProps) {
  return variant === 'filled' ? (
    <svg viewBox="0 0 24 24" {...fillProps} {...rest}>
      <path d="M10.6 3.4h2.8l.5 2.3 1.9.8 2-1.2 2 2-1.2 2 .8 1.9 2.3.5v2.8l-2.3.5-.8 1.9 1.2 2-2 2-2-1.2-1.9.8-.5 2.3h-2.8l-.5-2.3-1.9-.8-2 1.2-2-2 1.2-2-.8-1.9-2.3-.5v-2.8l2.3-.5.8-1.9-1.2-2 2-2 2 1.2 1.9-.8.5-2.3Z" />
      <circle cx="12" cy="12" r="3" fill="#fff" fillOpacity="0.9" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" {...strokeProps} {...rest}>
      <path d="M10.7 3.6h2.6l.5 2.1 1.8.8 1.9-1.1 1.8 1.8-1.1 1.9.8 1.8 2.1.5v2.6l-2.1.5-.8 1.8 1.1 1.9-1.8 1.8-1.9-1.1-1.8.8-.5 2.1h-2.6l-.5-2.1-1.8-.8-1.9 1.1-1.8-1.8 1.1-1.9-.8-1.8-2.1-.5v-2.6l2.1-.5.8-1.8-1.1-1.9 1.8-1.8 1.9 1.1 1.8-.8.5-2.1Z" />
      <circle cx="12" cy="12" r="2.8" />
    </svg>
  );
}

function OwnerIcon({ variant = 'filled', ...rest }: IconProps) {
  return variant === 'outline' ? (
    <svg viewBox="0 0 24 24" {...strokeProps} {...rest}>
      <path d="m12 3.6 2.3 4.7 5.2.8-3.8 3.6.9 5.1-4.6-2.4-4.6 2.4.9-5.1-3.8-3.6 5.2-.8L12 3.6Z" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" {...fillProps} {...rest}>
      <path d="m12 3.4 2.4 4.8 5.3.8-3.8 3.7.9 5.2-4.8-2.5-4.8 2.5.9-5.2-3.8-3.7 5.3-.8L12 3.4Z" />
    </svg>
  );
}

const ICONS: Record<NavIconName, (props: IconProps) => ReturnType<typeof TodayIcon>> = {
  today: TodayIcon,
  chores: ChoresIcon,
  household: HouseholdIcon,
  more: MoreIcon,
  routines: RoutinesIcon,
  home: HomeIcon,
  supplies: SuppliesIcon,
  shopping: ShoppingIcon,
  activity: ActivityIcon,
  notifications: NotificationsIcon,
  settings: SettingsIcon,
  owner: OwnerIcon,
};

/** Nav/UI icon; `variant` picks outline (default) or filled rendering. */
export function NavIcon({ name, variant = 'outline', ...rest }: { name: NavIconName; variant?: IconVariant } & SVGProps<SVGSVGElement>) {
  const Cmp = ICONS[name];
  return <Cmp variant={variant} {...rest} />;
}
