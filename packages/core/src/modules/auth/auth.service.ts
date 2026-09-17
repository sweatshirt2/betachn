import { and, eq, gt, isNotNull, sql } from 'drizzle-orm';
import {
  oauthAccounts,
  people,
  sessions,
  users,
} from '@chorify/db';
import { AppError } from '../../errors';
import type { Clock, PasswordHasher, SecureTokens, TokenDigester } from '../../ports';
import type { Executor, UnitOfWork } from '../../db';
import { permissionMapForPerson } from '../people';
import { HouseholdsService } from '../households';
import { passwordIssues } from './auth.rules';
import { normalizeUsername } from './auth.helpers';
import type {
  HouseholdPreviewInput,
  HouseholdPreviewResponse,
  LinkGoogleInput,
  LoginInput,
  RegisterOnlineInput,
  SwitchProfileInput,
} from './auth.schema';
import type { AuthenticatedContext, SessionSnapshot } from './auth.types';
import { z } from 'zod';

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

/** Google identity resolved by the route's OAuth code exchange (D50). */
export interface ResolvedGoogleIdentity {
  providerAccountId: string;
}


/** Raw bearer token returned ONCE — never persisted server-side. */
export interface IssuedSession {
  session: SessionSnapshot;
  token: string;
}


const insertedUserRow = z.object({ id: z.string().uuid(), personId: z.string().uuid().nullable() });

const sessionCoreRow = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid().nullable(),
  activePersonId: z.string().uuid(),
  expiresAt: z.date(),
});

interface UserRow {
  id: string;
  username: string | null;
  passwordHash: string | null;
  personId: string | null;
  householdId: string | null;
}

/**
 * Identity flows (§4.6 / D49–D57). Bearer-only: raw tokens live solely in
 * redux-persist; sessions persist sha256 only. Login failures are UNIFORM —
 * no enumeration of codes/usernames/passwords (D66). Rate limiting is a
 * route-level concern backed by auth_attempts (D66).
 *
 * Registration claims an OFFLINE household's code (D62): the server-side
 * household row already exists through offline creation sync or is created
 * during import adoption; activePerson attaches when profiles exist.
 */
export class AuthService {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly hasher: PasswordHasher,
    private readonly tokens: SecureTokens,
    private readonly digester: TokenDigester,
    private readonly clock: Clock,
    private readonly householdsService: HouseholdsService,
  ) {}

  /** Phone-collect signup (D51): verified contact deferred to SMS milestone. */
  async registerWithPassword(
    input: RegisterOnlineInput & { mode: 'phone' },
  ): Promise<IssuedSession> {
    const issues = passwordIssues(input.password);
    if (issues.length > 0) {
      throw new AppError('VALIDATION_ERROR', 'Choose a stronger password', { issues });
    }
    if (input.phone.trim().length === 0) {
      throw new AppError('VALIDATION_ERROR', 'A phone number is required');
    }
    const lowered = normalizeUsername(input.username);
    if (!lowered) throw new AppError('VALIDATION_ERROR', 'Invalid username');

    // D72 claim semantics: a phone-mode registration for a code the server
    // has never seen CLAIMS it — the offline device's household row is
    // created here so its later /import adoption lands in THIS row (§4.12).
    // Codes already known (pre-claimed offline creation sync) pass through.
    const existing = await this.householdsService.findByCode(input.code);
    const claimed =
      existing ??
      (await this.householdsService.claimByCode({
        name: input.code, // placeholder until adoption adopts the real name
        code: input.code,
        currency: 'ETB',
        timezone: 'Africa/Addis_Ababa',
      }));
    // Only a FRESH claim carries the scaffold owner-role for the placeholder.
    const claimRoleId = 'claimRoleId' in claimed ? claimed.claimRoleId : null;
    const householdId = claimed.id;
    await this.assertUsernameFree(this.uow.exec, householdId, lowered);

    const passwordHash = await this.hasher.hash(input.password);
    return this.uow.transact(async (tx) => {
      // Placeholder person gives the pre-import session a seat; /import
      // adoption repoints onto the imported owner and deletes it (§4.11).
      // A claimed household attaches the claim owner-role so the session's
      // permission map resolves (the import route requires view_people).
      const [placeholder] = await tx.insert(people).values({
        householdId,
        name: input.username,
        avatarEmoji: '👤',
        permissionOverrides: {},
        ...(claimRoleId ? { roleId: claimRoleId } : {}),
      }).returning();
      const personId = String(placeholder!.id);
      const [user] = await tx.insert(users).values({
        username: input.username,
        passwordHash,
        phone: input.phone,
        personId,
        householdId,
      }).returning();
      const created = insertedUserRow.parse(user);
      return this.mintSessionTx(tx, created.id, created.personId, householdId);
    });
  }

  /** Google-first signup (D50): no username/password until profile completion. */
  async registerWithGoogle(
    input: RegisterOnlineInput & { mode: 'google' },
    identity: ResolvedGoogleIdentity,
  ): Promise<IssuedSession> {
    const household = await this.requireHouseholdByCode(input.code);
    return this.uow.transact(async (tx) => {
      const linked = await tx.query.oauthAccounts!.findFirst({
        where: eq(oauthAccounts.providerAccountId, identity.providerAccountId),
        columns: { id: true },
      });
      if (linked) {
        throw new AppError('CONFLICT', 'This Google account is already linked to another user');
      }
      const [placeholder] = await tx.insert(people).values({
        householdId: household.id,
        name: 'Me',
        avatarEmoji: '👤',
        permissionOverrides: {},
      }).returning();
      const personId = String(placeholder!.id);
      const [user] = await tx.insert(users).values({
        username: null,
        passwordHash: null,
        phone: null,
        personId,
        householdId: household.id,
      }).returning();
      await tx.insert(oauthAccounts).values({
        userId: user!.id,
        provider: 'google',
        providerAccountId: identity.providerAccountId,
      });
      const created = insertedUserRow.parse(user);
      return this.mintSessionTx(tx, created.id, created.personId, household.id);
    });
  }

  /**
   * D101 step-down login, step 1: code → face grid. Uniform NOT_FOUND when
   * the code is unknown — same enumeration-resistance contract as login
   * (D66). Faces list every household person; hasPassword flags those whose
   * user row carries a password so the UI can pre-demand it.
   */
  async householdPreview(input: HouseholdPreviewInput): Promise<HouseholdPreviewResponse> {
    const household = await this.householdsService.findByCode(input.code);
    if (!household) throw new AppError('NOT_FOUND', 'Household code, username or password is incorrect');
    const rows = (await this.uow.exec.query.people!.findMany({
      where: eq(people.householdId, household.id),
      columns: { id: true, name: true, avatarEmoji: true, createdAt: true },
    })) as unknown as Array<{ id: string; name: string; avatarEmoji: string | null; createdAt: Date }>;
    rows.sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1));
    const credentialed = (await this.uow.exec.query.users!.findMany({
      where: and(eq(users.householdId, household.id), isNotNull(users.passwordHash)),
      columns: { personId: true },
    })) as unknown as Array<{ personId: string | null }>;
    const withPassword = new Set(credentialed.map((u) => u.personId).filter((id): id is string => id !== null));
    return {
      householdId: household.id,
      householdName: household.name,
      faces: rows.map((p) => ({
        personId: String(p.id),
        name: String(p.name),
        avatarEmoji: p.avatarEmoji,
        hasPassword: withPassword.has(String(p.id)),
      })),
    };
  }

  async login(input: LoginInput): Promise<IssuedSession> {
    const fail = () =>
      new AppError('UNAUTHENTICATED', 'Household code, username or password is incorrect');
    const household = await this.householdsService.findByCode(input.code);
    if (!household) throw fail();
    const lowered = normalizeUsername(input.username);
    if (!lowered) throw fail();

    const rows = (await this.uow.exec.query.users!.findMany({
      columns: { id: true, passwordHash: true, personId: true },
      where: and(
        eq(users.householdId, household.id),
        sql`lower(${users.username}) = ${lowered}`,
      ),
    })) as unknown as Array<{ id: string; passwordHash: string | null; personId: string | null }>;
    const user = rows[0];
    if (!user?.passwordHash || !user.personId) throw fail();

    const ok = await this.hasher.verify(user.passwordHash, input.password);
    if (!ok) throw fail();

    return this.uow.transact((tx) => this.mintSessionTx(tx, user.id, user.personId, household.id));
  }

  /** Google-button sign-in — independent of local password state (D50). */
  async loginWithGoogle(identity: ResolvedGoogleIdentity): Promise<IssuedSession> {
    const fail = () => new AppError('UNAUTHENTICATED', 'No Chorify account matches this Google account');
    const link = await this.uow.exec.query.oauthAccounts!.findFirst({
      where: eq(oauthAccounts.providerAccountId, identity.providerAccountId),
      columns: { userId: true },
    });
    if (!link) throw fail();
    const user = await this.userById(String(link.userId));
    if (!user.householdId || !user.personId) throw fail();
    return this.uow.transact((tx) => this.mintSessionTx(tx, user.id, user.personId, user.householdId!));
  }

  /** Fresh password confirmation required before linking (D50). */
  async linkGoogle(
    session: SessionSnapshot,
    input: LinkGoogleInput,
    identity: ResolvedGoogleIdentity,
  ): Promise<void> {
    if (!session.userId) throw new AppError('PASSWORD_REQUIRED', 'Sign in with your password first');
    const user = await this.userById(session.userId);
    if (!user.passwordHash) {
      throw new AppError('PASSWORD_REQUIRED', 'Set a password before linking Google');
    }
    const ok = await this.hasher.verify(user.passwordHash, input.currentPassword);
    if (!ok) throw new AppError('WRONG_PASSWORD', 'Password is incorrect');

    await this.uow.transact(async (tx) => {
      const taken = await tx.query.oauthAccounts!.findFirst({
        where: eq(oauthAccounts.providerAccountId, identity.providerAccountId),
        columns: { id: true },
      });
      if (taken) {
        throw new AppError('CONFLICT', 'This Google account is already linked to another user');
      }
      await tx.insert(oauthAccounts).values({
        userId: user.id,
        provider: 'google',
        providerAccountId: identity.providerAccountId,
      });
    });
  }

  /**
   * §4.6 switching: credentialed targets demand THAT user's password
   * (PASSWORD_REQUIRED / WRONG_PASSWORD); passwordless targets switch
   * instantly. The session row mutates — never mints new sessions.
   */
  async switchProfile(session: SessionSnapshot, input: SwitchProfileInput): Promise<SessionSnapshot> {
    return this.uow.transact(async (tx) => {
      const targetRows = await tx.query.people!.findMany({
        where: and(eq(people.id, input.personId), eq(people.householdId, session.householdId)),
        columns: { id: true },
      });
      if (targetRows.length === 0) throw new AppError('NOT_FOUND', 'Person not found');

      const targetUserRows = (await tx.query.users!.findMany({
        where: eq(users.personId, input.personId),
        columns: { id: true, passwordHash: true },
      })) as unknown as Array<{ id: string; passwordHash: string | null }>;
      const targetUser = targetUserRows[0];

      if (targetUser?.passwordHash) {
        if (input.password === undefined) {
          throw new AppError('PASSWORD_REQUIRED', 'This profile is protected by a password');
        }
        const ok = await this.hasher.verify(targetUser.passwordHash, input.password);
        if (!ok) throw new AppError('WRONG_PASSWORD', 'Password is incorrect');
      }

      const [updated] = await tx.update(sessions).set({
        activePersonId: input.personId,
        ...(targetUser ? { userId: targetUser.id } : {}),
      }).where(eq(sessions.id, session.sessionId)).returning();
      return this.toSnapshot(sessionCoreRow.parse(updated), session.householdId);
    });
  }

  /** Bearer resolution: sha256 lookup + expiry gate; cross-household safe. */
  async resolve(rawToken: string): Promise<SessionSnapshot> {
    const row = await this.findSessionByToken(rawToken);
    if (!row) throw new AppError('UNAUTHENTICATED', 'Sign in again');
    return row;
  }

  async logout(rawToken: string): Promise<void> {
    await this.uow.exec.delete(sessions).where(eq(sessions.tokenHash, this.digest(rawToken)));
  }

  /** GET /me payload — permissions always follow session.activePersonId (§4.6). */
  async authenticatedContext(session: SessionSnapshot): Promise<AuthenticatedContext> {
    const [householdRecord, personName] = await Promise.all([
      this.householdsService.get(session.householdId),
      this.activePersonName(session.activePersonId),
    ]);
    const permissionMap = await permissionMapForPerson(this.uow.exec, session.activePersonId);
    let username: string | null = null;
    if (session.userId) username = (await this.userById(session.userId)).username;
    return { session, username, activePersonName: personName, household: householdRecord, permissionMap };
  }

  private async findSessionByToken(rawToken: string): Promise<SessionSnapshot | null> {
    const rows = (await this.uow.exec.query.sessions!.findMany({
      columns: { id: true, userId: true, activePersonId: true, expiresAt: true },
      where: and(eq(sessions.tokenHash, this.digest(rawToken)), gt(sessions.expiresAt, this.clock.now())),
    })) as unknown as Array<{
      id: string;
      userId: string | null;
      activePersonId: string;
      expiresAt: Date;
    }>;
    const row = rows[0];
    if (!row) return null;
    const person = await this.uow.exec.query.people!.findFirst({
      where: eq(people.id, row.activePersonId),
      columns: { householdId: true },
    });
    if (!person) return null;
    return this.toSnapshot(sessionCoreRow.parse(row), String(person.householdId));
  }

  private async requireHouseholdByCode(code: string) {
    const household = await this.householdsService.findByCode(code);
    if (!household) {
      throw new AppError('NOT_FOUND', 'No household carries this code yet');
    }
    return household;
  }

  private async assertUsernameFree(exec: Executor, householdId: string, lowered: string): Promise<void> {
    const taken = await exec.query.users!.findMany({
      columns: { id: true },
      where: and(eq(users.householdId, householdId), sql`lower(${users.username}) = ${lowered}`),
    });
    if (taken.length > 0) {
      throw new AppError('CONFLICT', 'That username is taken in this household');
    }
  }

  private async mintSessionTx(
    tx: Executor,
    userId: string | null,
    activePersonId: string | null,
    householdId: string,
  ): Promise<IssuedSession> {
    if (!activePersonId) {
      throw new AppError('CONFLICT', 'Complete profile setup before signing in');
    }
    const rawToken = this.tokens.nextToken(32);
    const expiresAt = new Date(this.clock.now().getTime() + SESSION_TTL_MS);
    const [row] = await tx.insert(sessions).values({
      userId,
      activePersonId,
      tokenHash: this.digest(rawToken),
      expiresAt,
    }).returning();
    return { session: this.toSnapshot(sessionCoreRow.parse(row), householdId), token: rawToken };
  }

  private toSnapshot(
    row: { id: string; userId: string | null; activePersonId: string; expiresAt: Date },
    householdId: string,
  ): SessionSnapshot {
    return {
      sessionId: row.id,
      userId: row.userId,
      activePersonId: row.activePersonId,
      householdId,
      expiresAt: row.expiresAt,
    };
  }

  private digest(rawToken: string): string {
    return this.digester.sha256(rawToken);
  }

  private async userById(id: string): Promise<UserRow> {
    const rows = (await this.uow.exec.query.users!.findMany({
      columns: { id: true, username: true, passwordHash: true, personId: true, householdId: true },
      where: eq(users.id, id),
    })) as unknown as UserRow[];
    if (!rows[0]) throw new AppError('NOT_FOUND', 'User not found');
    return rows[0];
  }

  private async activePersonName(personId: string): Promise<string> {
    const rows = await this.uow.exec.query.people!.findMany({
      where: eq(people.id, personId),
      columns: { name: true },
    });
    return String(rows[0]?.name ?? '');
  }
}
