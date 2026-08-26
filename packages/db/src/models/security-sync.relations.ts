import { relations } from 'drizzle-orm';
import { oauthAccounts } from './security.models';
import { householdChanges } from './sync.models';
import { users } from './users.model';
import { households } from './households.model';
import { people } from './people.model';

export const oauthAccountsRelations = relations(oauthAccounts, ({ one }) => ({
  user: one(users, { fields: [oauthAccounts.userId], references: [users.id] }),
}));

export const householdChangesRelations = relations(householdChanges, ({ one }) => ({
  household: one(households, {
    fields: [householdChanges.householdId],
    references: [households.id],
  }),
  actor: one(people, {
    fields: [householdChanges.actorPersonId],
    references: [people.id],
  }),
}));
