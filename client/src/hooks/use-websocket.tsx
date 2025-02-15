import { useEffect, useRef } from "react";
import { useAuth } from "./use-auth";

export function useWebSocket(onMessage: (data: any) => void) {
  const { user } = useAuth();
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!user) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws?userId=${user.id}`;
    const ws = new WebSocket(wsUrl);

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      onMessage(data);
    };

    wsRef.current = ws;

    return () => {
      ws.close();
    };
  }, [user, onMessage]);

  return wsRef.current;
}
