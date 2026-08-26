import type { PermissionMap } from '../../permissions';
import type { HouseholdRecord } from '../households';

/** Row shape of sessions as services see it (parsed, not raw drizzle). */
export interface SessionSnapshot {
  sessionId: string;
  userId: string | null;
  activePersonId: string;
  householdId: string;
  expiresAt: Date;
}

export interface AuthenticatedContext {
  session: SessionSnapshot;
  /** Null until a Google-first user completes profile setup (D50). */
  username: string | null;
  activePersonName: string;
  household: HouseholdRecord;
  permissionMap: PermissionMap;
}
