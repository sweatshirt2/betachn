import { relations } from 'drizzle-orm';
import { households } from './households';
import { people, users } from './people-users';
import { roles } from './roles';
import {
  assignmentRules,
  occurrences,
  responsibilities,
  routines,
  subtasks,
} from './scheduling';
import { assets, rooms, serviceRecords } from './home';
import { shoppingItems, supplies } from './resources';

/** Relational reads on device mirror the server graph shape. */
export const householdsRelations = relations(households, ({ many }) => ({
  people: many(people),
  roles: many(roles),
}));

export const usersRelations = relations(users, ({ one }) => ({
  person: one(people, { fields: [users.personId], references: [people.id] }),
  household: one(households, { fields: [users.householdId], references: [households.id] }),
}));

export const peopleRelations = relations(people, ({ one }) => ({
  household: one(households, { fields: [people.householdId], references: [households.id] }),
  role: one(roles, { fields: [people.roleId], references: [roles.id] }),
}));

export const rolesRelations = relations(roles, ({ one, many }) => ({
  household: one(households, { fields: [roles.householdId], references: [households.id] }),
  members: many(people),
}));

export const routinesRelations = relations(routines, ({ many }) => ({
  responsibilities: many(responsibilities),
}));

export const responsibilitiesRelations = relations(responsibilities, ({ one, many }) => ({
  routine: one(routines, { fields: [responsibilities.routineId], references: [routines.id] }),
  room: one(rooms, { fields: [responsibilities.roomId], references: [rooms.id] }),
  subtasks: many(subtasks),
  assignmentRules: many(assignmentRules),
}));

export const subtasksRelations = relations(subtasks, ({ one }) => ({
  responsibility: one(responsibilities, {
    fields: [subtasks.responsibilityId],
    references: [responsibilities.id],
  }),
  assignee: one(people, { fields: [subtasks.assigneePersonId], references: [people.id] }),
}));

export const assignmentRulesRelations = relations(assignmentRules, ({ one }) => ({
  responsibility: one(responsibilities, {
    fields: [assignmentRules.responsibilityId],
    references: [responsibilities.id],
  }),
}));

export const occurrencesRelations = relations(occurrences, ({ one }) => ({
  responsibility: one(responsibilities, {
    fields: [occurrences.responsibilityId],
    references: [responsibilities.id],
  }),
  rule: one(assignmentRules, { fields: [occurrences.ruleId], references: [assignmentRules.id] }),
}));

export const roomsRelations = relations(rooms, ({ many }) => ({
  assets: many(assets),
}));

export const assetsRelations = relations(assets, ({ one, many }) => ({
  room: one(rooms, { fields: [assets.roomId], references: [rooms.id] }),
  serviceRecords: many(serviceRecords),
}));

export const suppliesRelations = relations(supplies, ({ many }) => ({
  shoppingItems: many(shoppingItems),
}));
