import session from "express-session";
import { User, InsertUser, Coin, InsertCoin, GameTimeRequest, InsertGameTimeRequest, GameTimePurchase } from "@shared/schema";
import { db } from "./db";
import { eq, and } from "drizzle-orm";
import { users, coins, gameTimeRequests, gameTimePurchases } from "@shared/schema";
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

  // New methods
  updateUserGameTime(userId: number, minutes: number): Promise<void>;
  updateUserCoins(userId: number, amount: number): Promise<void>;
  purchaseGameTime(childId: number, minutes: number, coinsSpent: number): Promise<GameTimePurchase>;
  getGameTimeBalance(userId: number): Promise<number>;
  getGameTimePurchaseHistory(userId: number): Promise<GameTimePurchase[]>;
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

  async updateUserGameTime(userId: number, minutes: number): Promise<void> {
    await db
      .update(users)
      .set({
        gameTimeBalance: minutes,
      })
      .where(eq(users.id, userId));
  }

  async updateUserCoins(userId: number, amount: number): Promise<void> {
    await db
      .update(users)
      .set({
        coinBalance: amount,
      })
      .where(eq(users.id, userId));
  }

  async purchaseGameTime(childId: number, minutes: number, coinsSpent: number): Promise<GameTimePurchase> {
    const [purchase] = await db.transaction(async (tx) => {
      // Get current balances
      const [user] = await tx
        .select({
          coinBalance: users.coinBalance,
          gameTimeBalance: users.gameTimeBalance,
        })
        .from(users)
        .where(eq(users.id, childId));

      if (!user || user.coinBalance < coinsSpent) {
        throw new Error("Insufficient coins");
      }

      // Update balances
      await tx
        .update(users)
        .set({
          coinBalance: user.coinBalance - coinsSpent,
          gameTimeBalance: user.gameTimeBalance + minutes,
        })
        .where(eq(users.id, childId));

      // Record purchase
      const [purchase] = await tx
        .insert(gameTimePurchases)
        .values({
          childId,
          minutes,
          coinsSpent,
        })
        .returning();

      return [purchase];
    });

    return purchase;
  }

  async getGameTimeBalance(userId: number): Promise<number> {
    const [user] = await db
      .select({ gameTimeBalance: users.gameTimeBalance })
      .from(users)
      .where(eq(users.id, userId));
    return user?.gameTimeBalance || 0;
  }

  async getGameTimePurchaseHistory(userId: number): Promise<GameTimePurchase[]> {
    return await db
      .select()
      .from(gameTimePurchases)
      .where(eq(gameTimePurchases.childId, userId))
      .orderBy(gameTimePurchases.createdAt);
  }
}

export const storage = new DatabaseStorage();