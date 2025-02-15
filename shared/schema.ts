import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role", { enum: ["parent", "child"] }).notNull(),
  parentId: integer("parent_id").references(() => users.id),
  gameDayBalance: integer("game_day_balance").notNull().default(0),
  coinBalance: integer("coin_balance").notNull().default(0),
});

export const coins = pgTable("coins", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  amount: integer("amount").notNull(),
  reason: text("reason").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const gameTimeRequests = pgTable("game_time_requests", {
  id: serial("id").primaryKey(),
  childId: integer("child_id").references(() => users.id).notNull(),
  parentId: integer("parent_id").references(() => users.id),
  days: integer("days").notNull(),
  status: text("status", { enum: ["pending", "approved", "rejected"] }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const gameTimePurchases = pgTable("game_time_purchases", {
  id: serial("id").primaryKey(),
  childId: integer("child_id").references(() => users.id).notNull(),
  days: integer("days").notNull(),
  coinsSpent: integer("coins_spent").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Schema definitions
export const insertUserSchema = createInsertSchema(users);
export const insertCoinSchema = createInsertSchema(coins);
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

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertCoin = z.infer<typeof insertCoinSchema>;
export type InsertGameTimeRequest = z.infer<typeof insertGameTimeRequestSchema>;
export type InsertGameTimePurchase = z.infer<typeof insertGameTimePurchaseSchema>;

export type User = typeof users.$inferSelect;
export type Coin = typeof coins.$inferSelect;
export type GameTimeRequest = typeof gameTimeRequests.$inferSelect;
export type GameTimePurchase = typeof gameTimePurchases.$inferSelect;