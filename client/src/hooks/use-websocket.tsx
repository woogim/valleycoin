import { useEffect, useRef, useCallback } from "react";
import { useAuth } from "./use-auth";

const RECONNECT_INTERVAL = 3000; // 3초마다 재연결 시도
const MAX_RECONNECT_ATTEMPTS = 5;

export function useWebSocket(onMessage: (data: any) => void) {
  const { user } = useAuth();
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttempts = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();

  const connect = useCallback(() => {
    if (!user || reconnectAttempts.current >= MAX_RECONNECT_ATTEMPTS) return;

    try {
      // 이전 연결 정리
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }

      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}/ws?userId=${user.id}`;
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log("[WebSocket] Connected");
        reconnectAttempts.current = 0; // 연결 성공시 재시도 카운트 리셋

        // 연결 상태 확인을 위한 ping
        const pingInterval = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: "ping" }));
          }
        }, 30000);

        // cleanup 함수에서 interval 정리
        ws.addEventListener("close", () => clearInterval(pingInterval));
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "pong") return; // ping-pong 응답은 무시
          onMessage(data);
        } catch (error) {
          console.error("[WebSocket] Failed to parse message:", error);
        }
      };

      ws.onclose = (event) => {
        console.log("[WebSocket] Disconnected", event.code, event.reason);
        wsRef.current = null;

        // 서버에서 명시적으로 닫은 경우는 재연결하지 않음
        if (event.code === 1000) {
          console.log("[WebSocket] Clean close, not attempting reconnect");
          return;
        }

        // 재연결 시도
        if (reconnectAttempts.current < MAX_RECONNECT_ATTEMPTS) {
          reconnectAttempts.current += 1;
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
          console.log(`[WebSocket] Reconnecting in ${delay}ms... Attempt ${reconnectAttempts.current}`);
          reconnectTimeoutRef.current = setTimeout(connect, delay);
        } else {
          console.log("[WebSocket] Max reconnection attempts reached");
        }
      };

      ws.onerror = (error) => {
        console.error("[WebSocket] Error:", error);
      };

      wsRef.current = ws;
    } catch (error) {
      console.error("[WebSocket] Connection error:", error);
      // 연결 에러시에도 재연결 로직 실행
      if (reconnectAttempts.current < MAX_RECONNECT_ATTEMPTS) {
        const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
        reconnectTimeoutRef.current = setTimeout(connect, delay);
      }
    }
  }, [user, onMessage]);

  useEffect(() => {
    if (user) {
      connect();
    }

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close(1000, "Component unmounted");
      }
    };
  }, [connect, user]);

  return wsRef.current;
}