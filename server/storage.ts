import session from "express-session";
import { User, InsertUser, Coin, InsertCoin, GameTimeRequest, InsertGameTimeRequest, GameTimePurchase, DeleteRequest, CoinRequest, InsertCoinRequest } from "@shared/schema";
import { db } from "./db";
import { eq, and, or, sql, inArray } from "drizzle-orm";
import { users, coins, gameTimeRequests, gameTimePurchases, deleteRequests, coinRequests } from "@shared/schema";
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
  getParentCoinHistory(childIds: number[]): Promise<(Coin & { username: string })[]>;
  updateCoin(coinId: number, update: { reason: string; amount: string }): Promise<Coin>;
  getCoin(coinId: number): Promise<Coin>;
  deleteCoin(coinId: number): Promise<void>;

  // Coin request operations
  createCoinRequest(request: InsertCoinRequest): Promise<CoinRequest>;
  getCoinRequests(parentId: number): Promise<(CoinRequest & { username: string })[]>;
  approveCoinRequest(requestId: number, approvedAmount: number): Promise<CoinRequest>;
  rejectCoinRequest(requestId: number): Promise<CoinRequest>;

  // Game time operations
  createGameTimeRequest(request: InsertGameTimeRequest): Promise<GameTimeRequest>;
  getGameTimeRequests(parentId: number): Promise<GameTimeRequest[]>;
  updateGameTimeRequest(id: number, status: "approved" | "rejected"): Promise<GameTimeRequest>;

  // Other operations
  updateUserCoins(userId: number, amount: number): Promise<void>;
  purchaseGameDays(childId: number, days: number, coinsSpent: number): Promise<GameTimePurchase>;
  getGameTimePurchaseHistory(userId: number): Promise<GameTimePurchase[]>;
  deleteUser(userId: number): Promise<void>;
  updateUsername(userId: number, username: string): Promise<User>;
  createDeleteRequest(childId: number, parentId: number): Promise<void>;
  getDeleteRequest(childId: number): Promise<DeleteRequest | undefined>;
  removeDeleteRequest(childId: number): Promise<void>;
  getDeleteRequests(parentId: number): Promise<DeleteRequest[]>;
  updateCoinUnit(userId: number, coinUnit: string): Promise<User>;
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
    const balance = user?.coinBalance || 0;
    const timestamp = new Date().toLocaleString();
    console.log(`[${timestamp}] 사용자 ${userId}의 코인 잔액: ${balance}`);
    return balance;
  }

  async addCoins(insertCoin: InsertCoin): Promise<Coin> {
    const [coin] = await db.transaction(async (tx) => {
      // 숫자형으로 변환하고 2자리 소수점으로 고정
      const coinAmount = parseFloat(insertCoin.amount.toString());
      if (isNaN(coinAmount)) {
        throw new Error("Invalid coin amount");
      }

      const [newCoin] = await tx
        .insert(coins)
        .values({
          ...insertCoin,
          amount: coinAmount.toFixed(2)
        })
        .returning();

      const [user] = await tx
        .select({
          coinBalance: users.coinBalance,
        })
        .from(users)
        .where(eq(users.id, insertCoin.userId));

      const currentBalance = parseFloat(user?.coinBalance?.toString() || "0");
      await tx
        .update(users)
        .set({
          coinBalance: (currentBalance + coinAmount).toFixed(2),
        })
        .where(eq(users.id, insertCoin.userId));

      const timestamp = new Date().toLocaleString();
      console.log(`[${timestamp}] 사용자 ${insertCoin.userId}의 코인 ${coinAmount > 0 ? '획득' : '사용'}: ${coinAmount.toFixed(2)}코인 (사유: ${insertCoin.reason})`);

      return [newCoin];
    });

    return coin;
  }

  async getCoinHistory(userId: number): Promise<Coin[]> {
    return await db
      .select()
      .from(coins)
      .where(eq(coins.userId, userId))
      .orderBy(sql`${coins.createdAt} DESC`);
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
      const [user] = await tx
        .select({
          coinBalance: users.coinBalance,
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

      await tx
        .update(users)
        .set({
          coinBalance: currentBalance - coinsSpent,
        })
        .where(eq(users.id, childId));

      const [purchase] = await tx
        .insert(gameTimePurchases)
        .values({
          childId,
          days,
          coinsSpent,
        })
        .returning();

      const timestamp = new Date().toLocaleString();
      console.log(`[${timestamp}] 사용자 ${childId}가 ${days}일 게임 시간 구매: ${coinsSpent}코인 사용`);

      return [purchase];
    });

    return purchase;
  }

  async getGameTimePurchaseHistory(userId: number): Promise<GameTimePurchase[]> {
    return await db
      .select()
      .from(gameTimePurchases)
      .where(eq(gameTimePurchases.childId, userId))
      .orderBy(sql`${gameTimePurchases.createdAt} DESC`);
  }

  async deleteUser(userId: number): Promise<void> {
    await db.transaction(async (tx) => {
      // Delete related records first
      await tx.delete(gameTimePurchases).where(eq(gameTimePurchases.childId, userId));
      await tx.delete(gameTimeRequests).where(
        or(
          eq(gameTimeRequests.childId, userId),
          eq(gameTimeRequests.parentId, userId)
        )
      );
      await tx.delete(coins).where(eq(coins.userId, userId));
      await tx.delete(deleteRequests).where(eq(deleteRequests.childId, userId));
      await tx.delete(coinRequests).where(eq(coinRequests.childId, userId));
      // Finally delete the user
      await tx.delete(users).where(eq(users.id, userId));
    });
  }

  async updateUsername(userId: number, username: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ username })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async createDeleteRequest(childId: number, parentId: number): Promise<void> {
    await db
      .insert(deleteRequests)
      .values({ childId, parentId });
  }

  async getDeleteRequest(childId: number): Promise<DeleteRequest | undefined> {
    const [request] = await db
      .select()
      .from(deleteRequests)
      .where(eq(deleteRequests.childId, childId));
    return request;
  }

  async removeDeleteRequest(childId: number): Promise<void> {
    await db
      .delete(deleteRequests)
      .where(eq(deleteRequests.childId, childId));
  }
  async getDeleteRequests(parentId: number): Promise<DeleteRequest[]> {
    return await db
      .select()
      .from(deleteRequests)
      .where(eq(deleteRequests.parentId, parentId))
      .orderBy(deleteRequests.createdAt);
  }

  async getParentCoinHistory(childIds: number[]): Promise<(Coin & { username: string })[]> {
    if (!childIds.length) return [];

    const history = await db
      .select({
        id: coins.id,
        userId: coins.userId,
        amount: coins.amount,
        reason: coins.reason,
        createdAt: coins.createdAt,
        username: users.username,
      })
      .from(coins)
      .leftJoin(users, eq(coins.userId, users.id))
      .where(inArray(coins.userId, childIds))
      .orderBy(sql`${coins.createdAt} DESC`);

    return history;
  }

  async getCoin(coinId: number): Promise<Coin> {
    const [coin] = await db
      .select()
      .from(coins)
      .where(eq(coins.id, coinId));

    if (!coin) {
      throw new Error("코인 내역을 찾을 수 없습니다");
    }

    return coin;
  }

  async updateCoin(coinId: number, update: { reason: string; amount: string }): Promise<Coin> {
    const [coin] = await db.transaction(async (tx) => {
      // 기존 코인 내역 조회
      const [oldCoin] = await tx
        .select()
        .from(coins)
        .where(eq(coins.id, coinId));

      if (!oldCoin) {
        throw new Error("코인 내역을 찾을 수 없습니다");
      }

      // 금액 변경분 계산
      const oldAmount = parseFloat(oldCoin.amount);
      const newAmount = parseFloat(update.amount);
      const amountDiff = newAmount - oldAmount;

      // 사용자의 현재 잔액 조회
      const [user] = await tx
        .select({
          coinBalance: users.coinBalance,
        })
        .from(users)
        .where(eq(users.id, oldCoin.userId));

      const currentBalance = parseFloat(user?.coinBalance?.toString() || "0");

      // 사용자 잔액 업데이트
      await tx
        .update(users)
        .set({
          coinBalance: (currentBalance + amountDiff).toFixed(2),
        })
        .where(eq(users.id, oldCoin.userId));

      // 코인 내역 업데이트
      const [updatedCoin] = await tx
        .update(coins)
        .set({
          reason: update.reason,
          amount: update.amount,
        })
        .where(eq(coins.id, coinId))
        .returning();

      return [updatedCoin];
    });

    return coin;
  }

  async deleteCoin(coinId: number): Promise<void> {
    await db.transaction(async (tx) => {
      // 기존 코인 내역 조회
      const [coin] = await tx
        .select()
        .from(coins)
        .where(eq(coins.id, coinId));

      if (!coin) {
        throw new Error("코인 내역을 찾을 수 없습니다");
      }

      // 사용자의 현재 잔액 조회
      const [user] = await tx
        .select({
          coinBalance: users.coinBalance,
        })
        .from(users)
        .where(eq(users.id, coin.userId));

      const currentBalance = parseFloat(user?.coinBalance?.toString() || "0");
      const coinAmount = parseFloat(coin.amount);

      // 사용자 잔액에서 코인 차감
      await tx
        .update(users)
        .set({
          coinBalance: (currentBalance - coinAmount).toFixed(2),
        })
        .where(eq(users.id, coin.userId));

      // 코인 내역 삭제
      await tx
        .delete(coins)
        .where(eq(coins.id, coinId));
    });
  }

  async createCoinRequest(insertRequest: InsertCoinRequest): Promise<CoinRequest> {
    const [request] = await db
      .insert(coinRequests)
      .values({ ...insertRequest, status: "pending" })
      .returning();
    return request;
  }

  async getCoinRequests(parentId: number): Promise<(CoinRequest & { username: string })[]> {
    const requests = await db
      .select({
        id: coinRequests.id,
        childId: coinRequests.childId,
        parentId: coinRequests.parentId,
        requestedAmount: coinRequests.requestedAmount,
        approvedAmount: coinRequests.approvedAmount,
        reason: coinRequests.reason,
        status: coinRequests.status,
        createdAt: coinRequests.createdAt,
        username: users.username,
      })
      .from(coinRequests)
      .leftJoin(users, eq(coinRequests.childId, users.id))
      .where(eq(coinRequests.parentId, parentId))
      .orderBy(sql`${coinRequests.createdAt} DESC`);

    return requests;
  }

  async approveCoinRequest(requestId: number, approvedAmount: number): Promise<CoinRequest> {
    return await db.transaction(async (tx) => {
      const [request] = await tx
        .select()
        .from(coinRequests)
        .where(eq(coinRequests.id, requestId));

      if (!request) {
        throw new Error("요청을 찾을 수 없습니다");
      }

      if (request.status !== "pending") {
        throw new Error("이미 처리된 요청입니다");
      }

      // Update request status and approved amount
      const [updatedRequest] = await tx
        .update(coinRequests)
        .set({
          status: "approved",
          approvedAmount: approvedAmount.toFixed(2),
        })
        .where(eq(coinRequests.id, requestId))
        .returning();

      // Add coins to child's balance
      await tx
        .insert(coins)
        .values({
          userId: request.childId,
          amount: approvedAmount.toFixed(2),
          reason: request.reason,
        });

      const [user] = await tx
        .select({
          coinBalance: users.coinBalance,
        })
        .from(users)
        .where(eq(users.id, request.childId));

      const currentBalance = parseFloat(user?.coinBalance?.toString() || "0");
      await tx
        .update(users)
        .set({
          coinBalance: (currentBalance + approvedAmount).toFixed(2),
        })
        .where(eq(users.id, request.childId));

      const timestamp = new Date().toLocaleString();
      console.log(`[${timestamp}] 코인 요청 승인: 사용자 ${request.childId}에게 ${approvedAmount}코인 지급 (사유: ${request.reason})`);

      return updatedRequest;
    });
  }

  async rejectCoinRequest(requestId: number): Promise<CoinRequest> {
    const [updatedRequest] = await db
      .update(coinRequests)
      .set({ status: "rejected" })
      .where(eq(coinRequests.id, requestId))
      .returning();

    if (!updatedRequest) {
      throw new Error("요청을 찾을 수 없습니다");
    }

    return updatedRequest;
  }
  async updateCoinUnit(userId: number, coinUnit: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ coinUnit })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }
}

export const storage = new DatabaseStorage();