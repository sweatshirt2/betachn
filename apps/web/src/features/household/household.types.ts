/** Person = household identity (CN §4). Wire type shared with GET /people + /profiles. */
export type PersonPayload = {
  id: string;
  name: string;
  avatarEmoji: string;
  roleId: string | null;
  phone: string | null;
  permissionOverrides: Record<string, boolean>;
  /** Identity facts (§5.5 header/member cards). Mirrors core personRowSchema. */
  sex: 'male' | 'female' | null;
  birthDate: string | null;
  age: number | null;
};

export type RolePayload = {
  id: string;
  name: string;
  description: string | null;
  isOwnerRole: boolean;
  isBuiltin: boolean;
  builtinKey: string | null;
  permissions: Record<string, boolean>;
};

export type CreatePersonBody = {
  name: string;
  avatarEmoji?: string;
  roleId?: string | null;
  phone?: string | null;
  sex?: 'male' | 'female' | null;
  birthDate?: string | null;
  age?: number | null;
};

export type UpdatePersonBody = {
  name?: string;
  roleId?: string | null;
  phone?: string | null;
  permissionOverrides?: Record<string, boolean>;
  sex?: 'male' | 'female' | null;
  birthDate?: string | null;
  age?: number | null;
};
