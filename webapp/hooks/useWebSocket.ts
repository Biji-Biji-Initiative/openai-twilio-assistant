import { useState, useEffect, useCallback, useRef } from 'react';
import { Item } from '@/components/types';
import handleRealtimeEvent from '@/lib/handle-realtime-event';
import { logger } from '@/lib/logger';

const RECONNECT_DELAY = 3000; // 3 seconds
const MAX_RECONNECT_ATTEMPTS = 5;
const PING_INTERVAL = 30000; // 30 seconds

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
  
  // Use refs for values that shouldn't trigger re-renders
  const wsRef = useRef<WebSocket | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout>();
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const isCleaningUpRef = useRef(false);

  const cleanup = useCallback(() => {
    isCleaningUpRef.current = true;
    
    // Clear intervals and timeouts
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = undefined;
    }
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = undefined;
    }
    
    // Close WebSocket connection
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
      setWs(null);
    }
    
    isCleaningUpRef.current = false;
  }, []);

  const connect = useCallback(() => {
    if (!ready || wsRef.current || reconnectAttempts >= MAX_RECONNECT_ATTEMPTS || isCleaningUpRef.current) {
      return;
    }

    try {
      const wsUrl = new URL("/logs", process.env.NEXT_PUBLIC_BACKEND_URL || "");
      wsUrl.protocol = wsUrl.protocol.replace("http", "ws");
      const newWs = new WebSocket(wsUrl.toString());
      wsRef.current = newWs;

      newWs.onopen = () => {
        logger.info("Connected to logs websocket");
        setCallStatus("connected");
        setError(null);
        setReconnectAttempts(0);
        setWs(newWs);

        // Set up ping interval
        pingIntervalRef.current = setInterval(() => {
          if (newWs.readyState === WebSocket.OPEN) {
            newWs.send(JSON.stringify({ type: 'ping' }));
          }
        }, PING_INTERVAL);
      };

      newWs.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'pong') {
            logger.debug("Received pong from server");
            return;
          }
          
          logger.debug("Received logs event:", data);
          handleRealtimeEvent(data, setItems);
        } catch (err) {
          logger.error("Failed to parse WebSocket message:", err);
          setError("Failed to parse WebSocket message");
        }
      };

      newWs.onclose = (event) => {
        logger.info("Logs websocket disconnected", {
          code: event.code,
          reason: event.reason,
          wasClean: event.wasClean
        });
        
        // Clear ping interval
        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current);
          pingIntervalRef.current = undefined;
        }
        
        wsRef.current = null;
        setWs(null);
        setCallStatus("disconnected");
        
        // Attempt to reconnect if not cleaning up
        if (!isCleaningUpRef.current && reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
          setReconnectAttempts(prev => prev + 1);
          reconnectTimeoutRef.current = setTimeout(connect, RECONNECT_DELAY);
        } else if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
          setError("Maximum reconnection attempts reached");
        }
      };

      newWs.onerror = (event) => {
        logger.error("WebSocket error:", event);
        setError("WebSocket connection error");
      };

    } catch (err) {
      logger.error("Failed to create WebSocket:", err);
      setError("Failed to create WebSocket connection");
      wsRef.current = null;
      setWs(null);
    }
  }, [ready, reconnectAttempts]);

  useEffect(() => {
    connect();
    return cleanup;
  }, [connect, cleanup]);

  return { 
    items, 
    ws, 
    callStatus,
    error,
    isReconnecting: reconnectAttempts > 0,
    reconnectAttempts
  };
} 