import { relations } from 'drizzle-orm';
import { assignmentRules, occurrences, responsibilities, routines, subtasks } from './scheduling.model';
import { activityEvents, notifications, notificationPrefs } from './social.model';
import { households } from './households.model';
import { people } from './people.model';
import { rooms } from './home.model';

export const routinesRelations = relations(routines, ({ one, many }) => ({
  household: one(households, { fields: [routines.householdId], references: [households.id] }),
  responsibilities: many(responsibilities),
}));

export const responsibilitiesRelations = relations(responsibilities, ({ one, many }) => ({
  household: one(households, {
    fields: [responsibilities.householdId],
    references: [households.id],
  }),
  routine: one(routines, {
    fields: [responsibilities.routineId],
    references: [routines.id],
  }),
  room: one(rooms, { fields: [responsibilities.roomId], references: [rooms.id] }),
  createdBy: one(people, {
    fields: [responsibilities.createdByPersonId],
    references: [people.id],
  }),
  subtasks: many(subtasks),
  assignmentRules: many(assignmentRules),
  occurrences: many(occurrences),
}));

export const subtasksRelations = relations(subtasks, ({ one }) => ({
  responsibility: one(responsibilities, {
    fields: [subtasks.responsibilityId],
    references: [responsibilities.id],
  }),
  assignee: one(people, {
    fields: [subtasks.assigneePersonId],
    references: [people.id],
  }),
}));

export const assignmentRulesRelations = relations(assignmentRules, ({ one, many }) => ({
  responsibility: one(responsibilities, {
    fields: [assignmentRules.responsibilityId],
    references: [responsibilities.id],
  }),
  createdBy: one(people, {
    fields: [assignmentRules.createdByPersonId],
    references: [people.id],
  }),
  occurrences: many(occurrences),
}));

export const occurrencesRelations = relations(occurrences, ({ one }) => ({
  household: one(households, {
    fields: [occurrences.householdId],
    references: [households.id],
  }),
  responsibility: one(responsibilities, {
    fields: [occurrences.responsibilityId],
    references: [responsibilities.id],
  }),
  rule: one(assignmentRules, {
    fields: [occurrences.ruleId],
    references: [assignmentRules.id],
  }),
  completedBy: one(people, {
    fields: [occurrences.completedByPersonId],
    references: [people.id],
  }),
}));

export const activityEventsRelations = relations(activityEvents, ({ one }) => ({
  household: one(households, {
    fields: [activityEvents.householdId],
    references: [households.id],
  }),
  actor: one(people, {
    fields: [activityEvents.actorPersonId],
    references: [people.id],
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  household: one(households, {
    fields: [notifications.householdId],
    references: [households.id],
  }),
  recipient: one(people, {
    fields: [notifications.recipientPersonId],
    references: [people.id],
  }),
}));

export const notificationPrefsRelations = relations(notificationPrefs, ({ one }) => ({
  person: one(people, {
    fields: [notificationPrefs.personId],
    references: [people.id],
  }),
}));
