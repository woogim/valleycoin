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
  updateUserGameDays(userId: number, days: number): Promise<void>;
  updateUserCoins(userId: number, amount: number): Promise<void>;
  purchaseGameDays(childId: number, days: number, coinsSpent: number): Promise<GameTimePurchase>;
  getGameDayBalance(userId: number): Promise<number>;
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
    const [user] = await db
      .select({
        coinBalance: users.coinBalance,
      })
      .from(users)
      .where(eq(users.id, userId));
    return user?.coinBalance || 0;
  }

  async addCoins(insertCoin: InsertCoin): Promise<Coin> {
    const [coin] = await db.transaction(async (tx) => {
      // Insert into coins table
      const [newCoin] = await tx
        .insert(coins)
        .values(insertCoin)
        .returning();

      // Update user's coin balance
      const [user] = await tx
        .select({
          coinBalance: users.coinBalance,
        })
        .from(users)
        .where(eq(users.id, insertCoin.userId));

      const currentBalance = user?.coinBalance || 0;
      await tx
        .update(users)
        .set({
          coinBalance: currentBalance + insertCoin.amount,
        })
        .where(eq(users.id, insertCoin.userId));

      return [newCoin];
    });

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

  async updateUserGameDays(userId: number, days: number): Promise<void> {
    await db
      .update(users)
      .set({
        gameDayBalance: days,
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

  async purchaseGameDays(childId: number, days: number, coinsSpent: number): Promise<GameTimePurchase> {
    const [purchase] = await db.transaction(async (tx) => {
      // Get current balance
      const [user] = await tx
        .select({
          coinBalance: users.coinBalance,
          gameDayBalance: users.gameDayBalance,
        })
        .from(users)
        .where(eq(users.id, childId));

      if (!user) {
        throw new Error("User not found");
      }

      const currentBalance = user.coinBalance || 0;
      if (currentBalance < coinsSpent) {
        throw new Error(`코인이 부족합니다. 필요: ${coinsSpent}, 보유: ${currentBalance}`);
      }

      // Update balances
      await tx
        .update(users)
        .set({
          coinBalance: currentBalance - coinsSpent,
          gameDayBalance: (user.gameDayBalance || 0) + days,
        })
        .where(eq(users.id, childId));

      // Record purchase
      const [purchase] = await tx
        .insert(gameTimePurchases)
        .values({
          childId,
          days,
          coinsSpent,
        })
        .returning();

      return [purchase];
    });

    return purchase;
  }

  async getGameDayBalance(userId: number): Promise<number> {
    const [user] = await db
      .select({ gameDayBalance: users.gameDayBalance })
      .from(users)
      .where(eq(users.id, userId));
    return user?.gameDayBalance || 0;
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