export type SessionPayload = {
  sessionId: string;
  userId: string | null;
  activePersonId: string;
  householdId: string;
  expiresAt: string;
};

export type AuthContextPayload = {
  session: SessionPayload;
  username: string | null;
  activePersonName: string;
  household: { id: string; name: string; code: string };
  permissionMap: Record<string, boolean>;
};

export type LoginResponse = { token: string; context: AuthContextPayload };

/** D101 wire shapes — mirror core's householdPreviewResponseSchema. */
export type HouseholdPreviewResponse = {
  householdId: string;
  householdName: string;
  faces: Array<{
    personId: string;
    name: string;
    avatarEmoji: string | null;
    hasPassword: boolean;
  }>;
};

/** Maps the wire context onto the RTK auth slice (identity state only). */
export function toAuthState(token: string, context: AuthContextPayload) {
  return {
    token,
    user:
      context.session.userId && context.username
        ? { id: context.session.userId, username: context.username }
        : null,
    activePerson: { id: context.session.activePersonId, name: context.activePersonName },
    household: {
      id: context.household.id,
      name: context.household.name,
      code: context.household.code,
    },
    permissionMap: context.permissionMap,
  };
}
