import { relations } from 'drizzle-orm';
import { households } from './households.model';
import { people } from './people.model';
import { roles } from './roles.model';
import { sessions } from './sessions.model';
import { users } from './users.model';

export const householdsRelations = relations(households, ({ many }) => ({
  people: many(people),
  roles: many(roles),
  users: many(users),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  person: one(people, { fields: [users.personId], references: [people.id] }),
  household: one(households, { fields: [users.householdId], references: [households.id] }),
  sessions: many(sessions),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
  activePerson: one(people, {
    fields: [sessions.activePersonId],
    references: [people.id],
  }),
}));

export const peopleRelations = relations(people, ({ one, many }) => ({
  household: one(households, { fields: [people.householdId], references: [households.id] }),
  role: one(roles, { fields: [people.roleId], references: [roles.id] }),
  user: one(users, { fields: [people.id], references: [users.personId] }),
  activeSessions: many(sessions),
}));

export const rolesRelations = relations(roles, ({ one, many }) => ({
  household: one(households, { fields: [roles.householdId], references: [households.id] }),
  members: many(people),
}));
