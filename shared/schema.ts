import { pgTable, text, serial, decimal, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role", { enum: ["parent", "child"] }).notNull(),
  parentId: serial("parent_id").references(() => users.id),
  coinBalance: decimal("coin_balance", { precision: 10, scale: 2 }).notNull().default("0"),
});

export const coins = pgTable("coins", {
  id: serial("id").primaryKey(),
  userId: serial("user_id").references(() => users.id).notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  reason: text("reason").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const coinRequests = pgTable("coin_requests", {
  id: serial("id").primaryKey(),
  childId: serial("child_id").references(() => users.id).notNull(),
  parentId: serial("parent_id").references(() => users.id).notNull(),
  requestedAmount: decimal("requested_amount", { precision: 10, scale: 2 }).notNull(),
  approvedAmount: decimal("approved_amount", { precision: 10, scale: 2 }),
  reason: text("reason").notNull(),
  status: text("status", { enum: ["pending", "approved", "rejected"] }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const gameTimeRequests = pgTable("game_time_requests", {
  id: serial("id").primaryKey(),
  childId: serial("child_id").references(() => users.id).notNull(),
  parentId: serial("parent_id").references(() => users.id),
  days: serial("days").notNull(),
  status: text("status", { enum: ["pending", "approved", "rejected"] }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const gameTimePurchases = pgTable("game_time_purchases", {
  id: serial("id").primaryKey(),
  childId: serial("child_id").references(() => users.id).notNull(),
  days: serial("days").notNull(),
  coinsSpent: decimal("coins_spent", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const deleteRequests = pgTable("delete_requests", {
  id: serial("id").primaryKey(),
  childId: serial("child_id").references(() => users.id).notNull(),
  parentId: serial("parent_id").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Schema definitions
export const insertUserSchema = createInsertSchema(users);
export const insertCoinSchema = createInsertSchema(coins);
export const insertCoinRequestSchema = createInsertSchema(coinRequests).pick({
  childId: true,
  parentId: true,
  requestedAmount: true,
  reason: true,
});
export const insertGameTimeRequestSchema = createInsertSchema(gameTimeRequests).pick({
  childId: true,
  parentId: true,
  days: true,
});
export const insertGameTimePurchaseSchema = createInsertSchema(gameTimePurchases).pick({
  childId: true,
  days: true,
  coinsSpent: true,
});
export const insertDeleteRequestSchema = createInsertSchema(deleteRequests).pick({
  childId: true,
  parentId: true,
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertCoin = z.infer<typeof insertCoinSchema>;
export type InsertCoinRequest = z.infer<typeof insertCoinRequestSchema>;
export type InsertGameTimeRequest = z.infer<typeof insertGameTimeRequestSchema>;
export type InsertGameTimePurchase = z.infer<typeof insertGameTimePurchaseSchema>;
export type InsertDeleteRequest = z.infer<typeof insertDeleteRequestSchema>;

export type User = typeof users.$inferSelect;
export type Coin = typeof coins.$inferSelect;
export type CoinRequest = typeof coinRequests.$inferSelect;
export type GameTimeRequest = typeof gameTimeRequests.$inferSelect;
export type GameTimePurchase = typeof gameTimePurchases.$inferSelect;
export type DeleteRequest = typeof deleteRequests.$inferSelect;