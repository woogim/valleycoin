import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { setupAuth } from "./auth";
import { storage } from "./storage";

// CSV 내보내기를 위한 유틸리티 함수
function generateCsv(data: any[], headers: string[], headerLabels: string[]): string {
  const headerRow = headerLabels.join(',') + '\n';
  const rows = data.map(item => 
    headers.map(header => {
      let value = typeof item[header] === 'string' ? item[header].replace(/,/g, ';') : item[header];
      if (header === 'createdAt') {
        value = new Date(value).toLocaleString();
      }
      if (header === 'amount') {
        value = parseFloat(value) >= 0 ? `+${value}` : value;
      }
      return `"${value}"`;
    }).join(',')
  ).join('\n');
  return headerRow + rows;
}

function isAuthenticated(req: Express.Request, res: Express.Response, next: Express.NextFunction) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).send("Unauthorized");
}

export async function registerRoutes(app: Express): Promise<Server> {
  // 타임아웃 설정 증가
  app.set('timeout', 120000);

  setupAuth(app);

  // 로깅 미들웨어
  app.use((req, res, next) => {
    const start = Date.now();
    const path = req.path;
    let capturedJsonResponse: Record<string, any> | undefined = undefined;

    const originalResJson = res.json;
    res.json = function (bodyJson, ...args) {
      capturedJsonResponse = bodyJson;
      return originalResJson.apply(res, [bodyJson, ...args]);
    };

    res.on("finish", () => {
      const duration = Date.now() - start;
      if (path.startsWith("/api")) {
        const timestamp = new Date().toLocaleString();
        let logLine = `[${timestamp}] ${req.method} ${path} ${res.statusCode} in ${duration}ms`;
        if (capturedJsonResponse) {
          logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
        }

        if (logLine.length > 100) {
          logLine = logLine.slice(0, 99) + "…";
        }

        console.log(logLine);
      }
    });

    next();
  });

  const httpServer = createServer(app);

  // WebSocket 서버 설정 수정
  const wss = new WebSocketServer({ 
    server: httpServer, 
    path: "/ws",
    perMessageDeflate: false, // 압축 비활성화로 성능 향상
    clientTracking: true, // 클라이언트 추적 활성화
  });

  const clients = new Map<number, WebSocket>();

  wss.on("connection", (ws, req) => {
    console.log("[WebSocket] New connection attempt");

    if (!req.url) {
      console.log("[WebSocket] No URL provided");
      ws.close();
      return;
    }

    const userId = parseInt(req.url.split("?userId=")[1]);
    if (isNaN(userId)) {
      console.log("[WebSocket] Invalid userId");
      ws.close();
      return;
    }

    console.log(`[WebSocket] Client connected for userId: ${userId}`);
    clients.set(userId, ws);

    // 핑퐁 체크 추가
    let isAlive = true;
    ws.on('pong', () => {
      isAlive = true;
    });

    // 에러 핸들링 추가
    ws.on('error', (error) => {
      console.log(`[WebSocket] Error for userId ${userId}:`, error);
      clients.delete(userId);
    });

    ws.on("close", () => {
      console.log(`[WebSocket] Client disconnected for userId: ${userId}`);
      clients.delete(userId);
    });

    // 초기 연결 확인 메시지 전송
    try {
      ws.send(JSON.stringify({ type: "CONNECTED" }));
    } catch (error) {
      console.log(`[WebSocket] Failed to send initial message to userId: ${userId}`);
    }
  });

  // 클라이언트 연결 상태 주기적 체크
  const interval = setInterval(() => {
    wss.clients.forEach((ws: WebSocket) => {
      if (!ws) return;

      if (ws.readyState === WebSocket.OPEN) {
        ws.ping(() => {});
      }
    });
  }, 30000);

  wss.on('close', () => {
    clearInterval(interval);
  });

  function notifyUser(userId: number, data: any) {
    const client = clients.get(userId);
    if (client?.readyState === WebSocket.OPEN) {
      try {
        console.log(`[WebSocket] Sending notification to userId: ${userId}`, data);
        client.send(JSON.stringify(data));
      } catch (error) {
        console.log(`[WebSocket] Failed to send message to userId: ${userId}`, error);
        clients.delete(userId);
      }
    } else {
      console.log(`[WebSocket] Client not available for userId: ${userId}`);
    }
  }

  // Get available parents for child registration
  app.get("/api/parents", async (req, res) => {
    const parents = await storage.getParents();
    res.json(parents);
  });

  // Get children for parent
  app.get("/api/children/:parentId", isAuthenticated, async (req, res) => {
    const children = await storage.getChildren(parseInt(req.params.parentId));
    res.json(children);
  });

  // Coin management routes
  app.post("/api/coins", isAuthenticated, async (req, res) => {
    try {
      const { userId, amount, reason } = req.body;

      // 숫자 형식 검증
      const numAmount = Number(amount);
      if (isNaN(numAmount)) {
        throw new Error("Invalid amount format");
      }

      // amount를 decimal로 변환 (최대 2자리 소수점)
      const decimalAmount = numAmount.toFixed(2);
      const coin = await storage.addCoins({
        userId,
        amount: decimalAmount,
        reason,
      });
      notifyUser(userId, { type: "COIN_UPDATE", coin });
      res.json(coin);
    } catch (error) {
      console.error("Error adding coins:", error);
      res.status(400).json({ message: "코인 추가에 실패했습니다. 올바른 금액을 입력해주세요." });
    }
  });

  app.get("/api/coins/balance/:userId", isAuthenticated, async (req, res) => {
    try {
      const balance = await storage.getCoinBalance(parseInt(req.params.userId));
      console.log(`Coin balance for user ${req.params.userId}:`, balance);
      // balance를 문자열로 반환 (최대 2자리 소수점)
      const numBalance = Number(balance);
      if (isNaN(numBalance)) {
        throw new Error("Invalid balance format");
      }
      res.json({ balance: numBalance.toFixed(2) });
    } catch (error) {
      console.error("Error getting coin balance:", error);
      res.status(400).json({ message: "잔액 조회에 실패했습니다." });
    }
  });

  app.get("/api/coins/history/:userId", isAuthenticated, async (req, res) => {
    try {
      const history = await storage.getCoinHistory(parseInt(req.params.userId));
      // amount를 decimal로 변환하여 반환 (최대 2자리 소수점)
      const formattedHistory = history.map(coin => {
        const numAmount = Number(coin.amount);
        if (isNaN(numAmount)) {
          throw new Error("Invalid amount format in history");
        }
        return {
          ...coin,
          amount: numAmount.toFixed(2)
        };
      });
      res.json(formattedHistory);
    } catch (error) {
      console.error("Error getting coin history:", error);
      res.status(400).json({ message: "코인 내역 조회에 실패했습니다." });
    }
  });

  // New route for getting coin history by parent
  app.get("/api/coins/parent-history/:parentId", isAuthenticated, async (req, res) => {
    try {
      const children = await storage.getChildren(parseInt(req.params.parentId));
      const childIds = children.map((child: any) => child.id);
      const history = await storage.getParentCoinHistory(childIds);
      res.json(history);
    } catch (error) {
      console.error("Error getting parent coin history:", error);
      res.status(400).json({ message: "코인 내역 조회에 실패했습니다." });
    }
  });

  // Update coin history
  app.patch("/api/coins/:coinId", isAuthenticated, async (req, res) => {
    try {
      const { reason, amount } = req.body;
      const numAmount = Number(amount);
      if (isNaN(numAmount)) {
        throw new Error("Invalid amount format");
      }
      const decimalAmount = numAmount.toFixed(2);
      const coin = await storage.updateCoin(parseInt(req.params.coinId), {
        reason,
        amount: decimalAmount,
      });
      notifyUser(coin.userId, { type: "COIN_UPDATE", coin });
      res.json(coin);
    } catch (error) {
      console.error("Error updating coin:", error);
      res.status(400).json({ message: "코인 내역 수정에 실패했습니다." });
    }
  });

  // Delete coin history
  app.delete("/api/coins/:coinId", isAuthenticated, async (req, res) => {
    try {
      const coin = await storage.getCoin(parseInt(req.params.coinId));
      await storage.deleteCoin(parseInt(req.params.coinId));
      notifyUser(coin.userId, { type: "COIN_UPDATE" });
      res.sendStatus(200);
    } catch (error) {
      console.error("Error deleting coin:", error);
      res.status(400).json({ message: "코인 내역 삭제에 실패했습니다." });
    }
  });


  // Add coin request routes
  app.post("/api/coins/request", isAuthenticated, async (req, res) => {
    try {
      const { childId, parentId, requestedAmount, reason } = req.body;
      const request = await storage.createCoinRequest({
        childId,
        parentId,
        requestedAmount,
        reason,
      });
      notifyUser(parentId, { type: "NEW_COIN_REQUEST", request });
      res.json(request);
    } catch (error) {
      console.error("Error creating coin request:", error);
      res.status(400).json({ message: "코인 요청 생성에 실패했습니다." });
    }
  });

  app.get("/api/coins/requests/:parentId", isAuthenticated, async (req, res) => {
    try {
      const requests = await storage.getCoinRequests(parseInt(req.params.parentId));
      res.json(requests);
    } catch (error) {
      console.error("Error getting coin requests:", error);
      res.status(400).json({ message: "코인 요청 조회에 실패했습니다." });
    }
  });

  app.post("/api/coins/request/:requestId/approve", isAuthenticated, async (req, res) => {
    try {
      const { approvedAmount } = req.body;
      const request = await storage.approveCoinRequest(parseInt(req.params.requestId), parseFloat(approvedAmount));
      notifyUser(request.childId, { type: "COIN_REQUEST_RESPONSE", request });
      res.json(request);
    } catch (error) {
      console.error("Error approving coin request:", error);
      res.status(400).json({ message: "코인 요청 승인에 실패했습니다." });
    }
  });

  app.post("/api/coins/request/:requestId/reject", isAuthenticated, async (req, res) => {
    try {
      const request = await storage.rejectCoinRequest(parseInt(req.params.requestId));
      notifyUser(request.childId, { type: "COIN_REQUEST_RESPONSE", request });
      res.json(request);
    } catch (error) {
      console.error("Error rejecting coin request:", error);
      res.status(400).json({ message: "코인 요청 거절에 실패했습니다." });
    }
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

  // Game time purchase routes
  app.post("/api/game-time/purchase", isAuthenticated, async (req, res) => {
    try {
      const { days, coinsSpent } = req.body;
      const purchase = await storage.purchaseGameDays(req.user!.id, days, coinsSpent);
      notifyUser(req.user!.id, { type: "GAME_TIME_PURCHASED", purchase });
      res.json(purchase);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/game-time/purchases/:userId", isAuthenticated, async (req, res) => {
    const purchases = await storage.getGameTimePurchaseHistory(parseInt(req.params.userId));
    res.json(purchases);
  });

  // 탈퇴 요청 조회 API
  app.get("/api/delete-requests/:parentId", isAuthenticated, async (req, res) => {
    const requests = await storage.getDeleteRequests(parseInt(req.params.parentId));
    res.json(requests);
  });

  // 계정 삭제 API
  app.post("/api/user/delete/:userId", isAuthenticated, async (req, res) => {
    try {
      await storage.deleteUser(parseInt(req.params.userId));
      res.sendStatus(200);
    } catch (error) {
      console.error("Delete request error:", error);
      res.status(400).json({ message: error.message });
    }
  });

  // CSV 다운로드 API 추가
  app.get("/api/coins/export/:userId", isAuthenticated, async (req, res) => {
    try {
      const history = await storage.getCoinHistory(parseInt(req.params.userId));
      const csv = generateCsv(
        history,
        ['amount', 'reason', 'createdAt'],
        ['금액', '사유', '날짜']
      );

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=coin-history.csv');
      res.send(csv);
    } catch (error) {
      console.error("Error exporting coin history:", error);
      res.status(400).json({ message: "내역 내보내기에 실패했습니다." });
    }
  });

  app.get("/api/game-time/export/:userId", isAuthenticated, async (req, res) => {
    try {
      const purchases = await storage.getGameTimePurchaseHistory(parseInt(req.params.userId));
      const csv = generateCsv(
        purchases,
        ['days', 'coinsSpent', 'createdAt'],
        ['구매 일수', '사용한 코인', '날짜']
      );

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=game-time-purchases.csv');
      res.send(csv);
    } catch (error) {
      console.error("Error exporting game time purchases:", error);
      res.status(400).json({ message: "구매 내역 내보내기에 실패했습니다." });
    }
  });

  app.get("/api/parent/coins/export/:parentId", isAuthenticated, async (req, res) => {
    try {
      const children = await storage.getChildren(parseInt(req.params.parentId));
      const childIds = children.map(child => child.id);
      const history = await storage.getParentCoinHistory(childIds);
      const csv = generateCsv(
        history,
        ['username', 'amount', 'reason', 'createdAt'],
        ['자녀 이름', '금액', '사유', '날짜']
      );

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=children-coin-history.csv');
      res.send(csv);
    } catch (error) {
      console.error("Error exporting parent coin history:", error);
      res.status(400).json({ message: "내역 내보내기에 실패했습니다." });
    }
  });

  app.post("/api/user/:userId/coin-unit", isAuthenticated, async (req, res) => {
    try {
      const { coinUnit } = req.body;
      const user = await storage.updateCoinUnit(parseInt(req.params.userId), coinUnit);
      res.json(user);
    } catch (error) {
      console.error("Error updating coin unit:", error);
      res.status(400).json({ message: "코인 단위 수정에 실패했습니다." });
    }
  });

  return httpServer;
}