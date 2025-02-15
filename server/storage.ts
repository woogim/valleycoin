import session from "express-session";
import { User, InsertUser, Coin, InsertCoin, GameTimeRequest, InsertGameTimeRequest } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";
import { users, coins, gameTimeRequests } from "@shared/schema";
import connectPg from "connect-pg-simple";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  sessionStore: session.Store;

  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getChildren(parentId: number): Promise<User[]>;
  getParents(): Promise<User[]>;

  // Coin operations
  getCoinBalance(userId: number): Promise<number>;
  addCoins(coin: InsertCoin): Promise<Coin>;
  getCoinHistory(userId: number): Promise<Coin[]>;

  // Game time operations
  createGameTimeRequest(request: InsertGameTimeRequest): Promise<GameTimeRequest>;
  getGameTimeRequests(parentId: number): Promise<GameTimeRequest[]>;
  updateGameTimeRequest(id: number, status: "approved" | "rejected"): Promise<GameTimeRequest>;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({
      pool: db.$client,
      createTableIfMissing: true,
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async getParents(): Promise<User[]> {
    return await db
      .select()
      .from(users)
      .where(eq(users.role, "parent"));
  }

  async getChildren(parentId: number): Promise<User[]> {
    return await db
      .select()
      .from(users)
      .where(eq(users.parentId, parentId));
  }

  async getCoinBalance(userId: number): Promise<number> {
    const result = await db
      .select({
        sum: coins.amount,
      })
      .from(coins)
      .where(eq(coins.userId, userId));

    return result[0]?.sum || 0;
  }

  async addCoins(insertCoin: InsertCoin): Promise<Coin> {
    const [coin] = await db.insert(coins).values(insertCoin).returning();
    return coin;
  }

  async getCoinHistory(userId: number): Promise<Coin[]> {
    return await db
      .select()
      .from(coins)
      .where(eq(coins.userId, userId))
      .orderBy(coins.createdAt);
  }

  async createGameTimeRequest(insertRequest: InsertGameTimeRequest): Promise<GameTimeRequest> {
    const [request] = await db
      .insert(gameTimeRequests)
      .values({ ...insertRequest, status: "pending" })
      .returning();
    return request;
  }

  async getGameTimeRequests(parentId: number): Promise<GameTimeRequest[]> {
    return await db
      .select()
      .from(gameTimeRequests)
      .where(eq(gameTimeRequests.parentId, parentId))
      .orderBy(gameTimeRequests.createdAt);
  }

  async updateGameTimeRequest(id: number, status: "approved" | "rejected"): Promise<GameTimeRequest> {
    const [request] = await db
      .update(gameTimeRequests)
      .set({ status })
      .where(eq(gameTimeRequests.id, id))
      .returning();
    return request;
  }
}

export const storage = new DatabaseStorage();