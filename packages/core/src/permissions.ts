import { AppError } from './errors';

/** Permission domains → keys. Fixed forever (plan §4.7); finance keys ship reserved. */
export const PERMISSION_CATALOG = {
  household: [
    'view_people',
    'add_people',
    'invite_people',
    'remove_people',
    'manage_roles',
    'manage_ownership',
    'configure_permissions',
  ],
  responsibilities: [
    'view',
    'create',
    'assign',
    'reassign',
    'manage_routines',
    'complete',
    'view_history',
  ],
  finances: [
    'view',
    'view_expenses',
    'create_expenses',
    'edit_expenses',
    'view_accounts',
    'manage_accounts',
    'view_budgets',
    'manage_budgets',
    'manage_goals',
  ],
  home: ['view_assets', 'manage_assets', 'manage_maintenance'],
  resources: ['manage_supplies', 'manage_shopping', 'manage_purchases'],
} as const satisfies Record<string, readonly string[]>;

export type PermDomain = keyof typeof PERMISSION_CATALOG;

export type PermKey = {
  [D in PermDomain]: `${D}.${(typeof PERMISSION_CATALOG)[D][number]}`;
}[PermDomain];

export type PermissionMap = Record<PermKey, boolean>;

export function allPermKeys(): PermKey[] {
  return (Object.entries(PERMISSION_CATALOG) as [PermDomain, readonly string[]][]).flatMap(
    ([domain, keys]) => keys.map((key) => `${domain}.${key}` as PermKey),
  );
}

function mapWith(spec: Partial<Record<PermDomain, readonly string[]>>): PermissionMap {
  const map = {} as PermissionMap;
  for (const perm of allPermKeys()) map[perm] = false;
  for (const [domain, keys] of Object.entries(spec) as [PermDomain, readonly string[]][]) {
    for (const key of keys) map[`${domain}.${key}` as PermKey] = true;
  }
  return map;
}

export const BUILTIN_ROLE_KEYS = [
  'father',
  'mother',
  'grandfather',
  'grandmother',
  'guardian',
  'adult',
  'teenager',
  'responsible_child',
  'child',
  'supervised_child',
  'family_member',
] as const;

export type BuiltinRoleKey = (typeof BUILTIN_ROLE_KEYS)[number];

const EVERY_RESPONSIBILITY = PERMISSION_CATALOG.responsibilities;
const EVERY_HOME = PERMISSION_CATALOG.home;
const EVERY_RESOURCES = PERMISSION_CATALOG.resources;

/** Factory matrices — "Reset to default" restores exactly these (plan §4.7). */
export const FACTORY_MATRICES: Record<BuiltinRoleKey, PermissionMap> = {
  father: mapWith({
    household: PERMISSION_CATALOG.household,
    responsibilities: EVERY_RESPONSIBILITY,
    finances: PERMISSION_CATALOG.finances,
    home: EVERY_HOME,
    resources: EVERY_RESOURCES,
  }),
  mother: mapWith({
    household: PERMISSION_CATALOG.household,
    responsibilities: EVERY_RESPONSIBILITY,
    finances: PERMISSION_CATALOG.finances,
    home: EVERY_HOME,
    resources: EVERY_RESOURCES,
  }),
  grandfather: mapWith({
    household: ['view_people', 'add_people'],
    responsibilities: EVERY_RESPONSIBILITY,
    finances: ['view', 'view_expenses', 'create_expenses'],
    home: EVERY_HOME,
    resources: EVERY_RESOURCES,
  }),
  grandmother: mapWith({
    household: ['view_people', 'add_people'],
    responsibilities: EVERY_RESPONSIBILITY,
    finances: ['view', 'view_expenses', 'create_expenses'],
    home: EVERY_HOME,
    resources: EVERY_RESOURCES,
  }),
  guardian: mapWith({
    household: ['view_people', 'add_people'],
    responsibilities: EVERY_RESPONSIBILITY,
    finances: ['view', 'view_expenses', 'create_expenses', 'view_accounts', 'view_budgets', 'manage_goals'],
    home: EVERY_HOME,
    resources: EVERY_RESOURCES,
  }),
  adult: mapWith({
    household: ['view_people', 'add_people'],
    responsibilities: EVERY_RESPONSIBILITY.filter((k) => k !== 'manage_routines'),
    finances: ['view', 'view_expenses', 'create_expenses', 'view_accounts', 'view_budgets'],
    home: ['view_assets', 'manage_maintenance'],
    resources: EVERY_RESOURCES,
  }),
  teenager: mapWith({
    household: ['view_people'],
    responsibilities: ['view', 'create', 'complete', 'view_history'],
    home: ['view_assets'],
    resources: ['manage_supplies', 'manage_shopping'],
  }),
  responsible_child: mapWith({
    household: ['view_people'],
    responsibilities: ['view', 'create', 'assign', 'complete', 'view_history'],
    home: ['view_assets'],
    resources: ['manage_supplies', 'manage_shopping'],
  }),
  child: mapWith({
    household: ['view_people'],
    responsibilities: ['view', 'complete'],
  }),
  supervised_child: mapWith({
    household: ['view_people'],
    responsibilities: ['view', 'complete'],
  }),
  family_member: mapWith({
    household: ['view_people'],
    responsibilities: ['view', 'complete', 'view_history'],
    home: ['view_assets'],
    resources: ['manage_shopping'],
  }),
};

/** Baseline for newly created custom roles: bare minimum participation. */
export function customRoleBaseline(): PermissionMap {
  return mapWith({ responsibilities: ['view', 'complete'] });
}

export interface RoleLike {
  isOwnerRole: boolean;
  permissions: Partial<PermissionMap>;
}

export interface PersonLike {
  permissionOverrides?: Partial<PermissionMap>;
  role?: RoleLike | null;
}

/**
 * Precedence (invariant CN §23): person override > owner flag > role matrix
 * > false. An explicit `false` override beats even an owner role.
 */
export function resolvePermission(person: PersonLike, key: PermKey): boolean {
  const override = person.permissionOverrides?.[key];
  if (override !== undefined) return override;
  if (!person.role) return false;
  if (person.role.isOwnerRole) return true;
  return person.role.permissions[key] ?? false;
}

/** Server-side authorization gate; the client-side map is display-only. */
export function requirePermission(map: Partial<PermissionMap>, key: PermKey): void {
  if (map[key] !== true) {
    throw new AppError('FORBIDDEN', `Missing required permission: ${key}`, {
      missingPermission: key,
    });
  }
}

/**
 * Full map for one person — same precedence chain as resolvePermission
 * (override > owner flag > role matrix > false), materialized once for
 * session contexts (server login responses, device session rehydration).
 */
export function permissionMapFor(person: PersonLike): PermissionMap {
  const map = {} as Record<string, boolean>;
  for (const domain of Object.keys(PERMISSION_CATALOG) as PermDomain[]) {
    for (const key of PERMISSION_CATALOG[domain]) {
      map[`${domain}.${key}`] = resolvePermission(person, `${domain}.${key}` as PermKey);
    }
  }
  return map as PermissionMap;
}
