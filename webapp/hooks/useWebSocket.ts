import { useState, useEffect, useCallback } from 'react';
import { Item } from '@/components/types';
import handleRealtimeEvent from '@/lib/handle-realtime-event';

const RECONNECT_DELAY = 3000; // 3 seconds
const MAX_RECONNECT_ATTEMPTS = 5;

interface WebSocketState {
  items: Item[];
  ws: WebSocket | null;
  callStatus: string;
  error: string | null;
  isReconnecting: boolean;
  reconnectAttempts: number;
}

export function useWebSocket(ready: boolean): WebSocketState {
  const [items, setItems] = useState<Item[]>([]);
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [callStatus, setCallStatus] = useState("disconnected");
  const [error, setError] = useState<string | null>(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);

  const connect = useCallback(() => {
    if (!ready || ws || reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) return;

    try {
      const wsUrl = new URL("/logs", process.env.NEXT_PUBLIC_BACKEND_URL || "");
      wsUrl.protocol = wsUrl.protocol.replace("http", "ws");
      const newWs = new WebSocket(wsUrl.toString());

      newWs.onopen = () => {
        console.log("Connected to logs websocket");
        setCallStatus("connected");
        setError(null);
        setReconnectAttempts(0);
      };

      newWs.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log("Received logs event:", data);
          handleRealtimeEvent(data, setItems);
        } catch (err) {
          console.error("Failed to parse WebSocket message:", err);
          setError("Failed to parse WebSocket message");
        }
      };

      newWs.onclose = () => {
        console.log("Logs websocket disconnected");
        setWs(null);
        setCallStatus("disconnected");
        
        // Attempt to reconnect
        if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
          setReconnectAttempts(prev => prev + 1);
          setTimeout(connect, RECONNECT_DELAY);
        } else {
          setError("Maximum reconnection attempts reached");
        }
      };

      newWs.onerror = (event) => {
        console.error("WebSocket error:", event);
        setError("WebSocket connection error");
      };

      setWs(newWs);
    } catch (err) {
      console.error("Failed to create WebSocket:", err);
      setError("Failed to create WebSocket connection");
    }
  }, [ready, ws, reconnectAttempts]);

  useEffect(() => {
    connect();

    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, [connect, ws]);

  return { 
    items, 
    ws, 
    callStatus,
    error,
    isReconnecting: reconnectAttempts > 0,
    reconnectAttempts
  };
} 