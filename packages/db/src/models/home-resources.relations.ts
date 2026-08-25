import { relations } from 'drizzle-orm';
import { assets, rooms, serviceRecords } from './home.model';
import { households } from './households.model';
import { shoppingItems, supplies } from './resources.model';

export const roomsRelations = relations(rooms, ({ one, many }) => ({
  household: one(households, { fields: [rooms.householdId], references: [households.id] }),
  assets: many(assets),
}));

export const assetsRelations = relations(assets, ({ one, many }) => ({
  household: one(households, { fields: [assets.householdId], references: [households.id] }),
  room: one(rooms, { fields: [assets.roomId], references: [rooms.id] }),
  serviceRecords: many(serviceRecords),
}));

export const serviceRecordsRelations = relations(serviceRecords, ({ one }) => ({
  asset: one(assets, { fields: [serviceRecords.assetId], references: [assets.id] }),
}));

export const suppliesRelations = relations(supplies, ({ one }) => ({
  household: one(households, { fields: [supplies.householdId], references: [households.id] }),
}));

export const shoppingItemsRelations = relations(shoppingItems, ({ one }) => ({
  household: one(households, {
    fields: [shoppingItems.householdId],
    references: [households.id],
  }),
  sourceSupply: one(supplies, {
    fields: [shoppingItems.sourceSupplyId],
    references: [supplies.id],
  }),
}));
