import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { setupAuth } from "./auth";
import { storage } from "./storage";

function isAuthenticated(req: Express.Request, res: Express.Response, next: Express.NextFunction) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).send("Unauthorized");
}

export async function registerRoutes(app: Express): Promise<Server> {
  setupAuth(app);

  const httpServer = createServer(app);
  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });

  const clients = new Map<number, WebSocket>();

  wss.on("connection", (ws, req) => {
    if (!req.url) return;
    const userId = parseInt(req.url.split("?userId=")[1]);
    if (isNaN(userId)) return;

    clients.set(userId, ws);

    ws.on("close", () => {
      clients.delete(userId);
    });
  });

  function notifyUser(userId: number, data: any) {
    const client = clients.get(userId);
    if (client?.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
    }
  }

  // Get available parents for child registration
  app.get("/api/parents", async (req, res) => {
    const parents = await storage.getParents();
    res.json(parents);
  });

  // Coin management routes
  app.post("/api/coins", isAuthenticated, async (req, res) => {
    const { userId, amount, reason } = req.body;
    const coin = await storage.addCoins({ userId, amount, reason });
    notifyUser(userId, { type: "COIN_UPDATE", coin });
    res.json(coin);
  });

  app.get("/api/coins/balance/:userId", isAuthenticated, async (req, res) => {
    const balance = await storage.getCoinBalance(parseInt(req.params.userId));
    res.json({ balance });
  });

  app.get("/api/coins/history/:userId", isAuthenticated, async (req, res) => {
    const history = await storage.getCoinHistory(parseInt(req.params.userId));
    res.json(history);
  });

  // Game time request routes
  app.post("/api/game-time/request", isAuthenticated, async (req, res) => {
    const request = await storage.createGameTimeRequest(req.body);
    notifyUser(request.parentId!, { type: "NEW_GAME_TIME_REQUEST", request });
    res.json(request);
  });

  app.get("/api/game-time/requests/:parentId", isAuthenticated, async (req, res) => {
    const requests = await storage.getGameTimeRequests(parseInt(req.params.parentId));
    res.json(requests);
  });

  app.post("/api/game-time/respond/:requestId", isAuthenticated, async (req, res) => {
    const request = await storage.updateGameTimeRequest(
      parseInt(req.params.requestId),
      req.body.status
    );
    notifyUser(request.childId, { type: "GAME_TIME_RESPONSE", request });
    res.json(request);
  });

  return httpServer;
}