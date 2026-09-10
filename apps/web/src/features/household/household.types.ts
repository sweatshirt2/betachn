export type PersonPayload = {
  id: string;
  name: string;
  avatarEmoji: string;
  roleId: string | null;
  phone: string | null;
  permissionOverrides: Record<string, boolean>;
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
};

export type UpdatePersonBody = {
  name?: string;
  roleId?: string | null;
  phone?: string | null;
  permissionOverrides?: Record<string, boolean>;
};
