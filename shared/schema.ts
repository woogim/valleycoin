import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role", { enum: ["parent", "child"] }).notNull(),
  parentId: integer("parent_id").references(() => users.id),
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
  minutes: integer("minutes").notNull(),
  status: text("status", { enum: ["pending", "approved", "rejected"] }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users);
export const insertCoinSchema = createInsertSchema(coins);
export const insertGameTimeRequestSchema = createInsertSchema(gameTimeRequests).pick({
  childId: true,
  parentId: true,
  minutes: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertCoin = z.infer<typeof insertCoinSchema>;
export type InsertGameTimeRequest = z.infer<typeof insertGameTimeRequestSchema>;

export type User = typeof users.$inferSelect;
export type Coin = typeof coins.$inferSelect;
export type GameTimeRequest = typeof gameTimeRequests.$inferSelect;