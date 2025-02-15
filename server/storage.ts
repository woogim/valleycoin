import session from "express-session";
import createMemoryStore from "memorystore";
import { User, InsertUser, Coin, InsertCoin, GameTimeRequest, InsertGameTimeRequest } from "@shared/schema";

const MemoryStore = createMemoryStore(session);

export interface IStorage {
  sessionStore: session.Store;
  
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getChildren(parentId: number): Promise<User[]>;

  // Coin operations
  getCoinBalance(userId: number): Promise<number>;
  addCoins(coin: InsertCoin): Promise<Coin>;
  getCoinHistory(userId: number): Promise<Coin[]>;

  // Game time operations
  createGameTimeRequest(request: InsertGameTimeRequest): Promise<GameTimeRequest>;
  getGameTimeRequests(parentId: number): Promise<GameTimeRequest[]>;
  updateGameTimeRequest(id: number, status: "approved" | "rejected"): Promise<GameTimeRequest>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private coins: Map<number, Coin>;
  private gameTimeRequests: Map<number, GameTimeRequest>;
  sessionStore: session.Store;
  currentId: number;

  constructor() {
    this.users = new Map();
    this.coins = new Map();
    this.gameTimeRequests = new Map();
    this.currentId = 1;
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000,
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async getChildren(parentId: number): Promise<User[]> {
    return Array.from(this.users.values()).filter(
      (user) => user.parentId === parentId && user.role === "child",
    );
  }

  async getCoinBalance(userId: number): Promise<number> {
    return Array.from(this.coins.values())
      .filter((coin) => coin.userId === userId)
      .reduce((sum, coin) => sum + coin.amount, 0);
  }

  async addCoins(insertCoin: InsertCoin): Promise<Coin> {
    const id = this.currentId++;
    const coin: Coin = {
      ...insertCoin,
      id,
      createdAt: new Date(),
    };
    this.coins.set(id, coin);
    return coin;
  }

  async getCoinHistory(userId: number): Promise<Coin[]> {
    return Array.from(this.coins.values())
      .filter((coin) => coin.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async createGameTimeRequest(insertRequest: InsertGameTimeRequest): Promise<GameTimeRequest> {
    const id = this.currentId++;
    const request: GameTimeRequest = {
      ...insertRequest,
      id,
      status: "pending",
      createdAt: new Date(),
    };
    this.gameTimeRequests.set(id, request);
    return request;
  }

  async getGameTimeRequests(parentId: number): Promise<GameTimeRequest[]> {
    return Array.from(this.gameTimeRequests.values())
      .filter((request) => request.parentId === parentId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async updateGameTimeRequest(id: number, status: "approved" | "rejected"): Promise<GameTimeRequest> {
    const request = this.gameTimeRequests.get(id);
    if (!request) {
      throw new Error("Request not found");
    }
    const updatedRequest = { ...request, status };
    this.gameTimeRequests.set(id, updatedRequest);
    return updatedRequest;
  }
}

export const storage = new MemStorage();
