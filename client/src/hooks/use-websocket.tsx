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
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}/ws?userId=${user.id}`;
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log("[WebSocket] Connected");
        reconnectAttempts.current = 0; // 연결 성공시 재시도 카운트 리셋
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          onMessage(data);
        } catch (error) {
          console.error("[WebSocket] Failed to parse message:", error);
        }
      };

      ws.onclose = () => {
        console.log("[WebSocket] Disconnected");
        wsRef.current = null;

        // 재연결 시도
        if (reconnectAttempts.current < MAX_RECONNECT_ATTEMPTS) {
          reconnectAttempts.current += 1;
          console.log(`[WebSocket] Reconnecting... Attempt ${reconnectAttempts.current}`);
          reconnectTimeoutRef.current = setTimeout(connect, RECONNECT_INTERVAL);
        }
      };

      ws.onerror = (error) => {
        console.error("[WebSocket] Error:", error);
      };

      wsRef.current = ws;
    } catch (error) {
      console.error("[WebSocket] Connection error:", error);
    }
  }, [user, onMessage]);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  return wsRef.current;
}