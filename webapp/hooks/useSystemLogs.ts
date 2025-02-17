import { useState, useEffect, useRef } from 'react';
import { logger } from '@/lib/logger';

export interface LogMessage {
  type: string;
  message: string;
  timestamp: string;
  level?: string;
}

export interface LogStats {
  total: number;
  byLevel: Record<string, number>;
  byType: Record<string, number>;
  errorRate: string;
  lastError?: string;
  recentActivity: number;
}

export interface SystemLogsState {
  logs: LogMessage[];
  isConnected: boolean;
  stats: LogStats;
  error: string | null;
  isReconnecting: boolean;
  reconnectAttempts: number;
}

export interface SystemLogsActions {
  clearLogs: () => void;
  downloadLogs: (logs: LogMessage[]) => void;
}

export function useSystemLogs(): [SystemLogsState, SystemLogsActions] {
  const [logs, setLogs] = useState<LogMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const wsRef = useRef<WebSocket | null>(null);

  // Calculate stats whenever logs change
  const stats: LogStats = {
    total: logs.length,
    byLevel: logs.reduce((acc, log) => {
      const level = log.level || 'unknown';
      acc[level] = (acc[level] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
    byType: logs.reduce((acc, log) => {
      acc[log.type] = (acc[log.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
    errorRate: ((logs.filter(log => log.level === 'error').length / logs.length) * 100 || 0).toFixed(1) + '%',
    lastError: [...logs].reverse().find(log => log.level === 'error')?.message,
    recentActivity: logs.filter(log => {
      const now = new Date().getTime();
      const logTime = new Date(log.timestamp).getTime();
      return now - logTime <= 60 * 1000;
    }).length
  };

  useEffect(() => {
    let isMounted = true;
    let reconnectTimeout: NodeJS.Timeout;
    const maxReconnectAttempts = 5;
    let pingInterval: NodeJS.Timeout;

    const connectWebSocket = () => {
      if (!isMounted || isReconnecting) return;

      if (wsRef.current) {
        wsRef.current.close(1000, "Creating new connection");
        wsRef.current = null;
      }

      setIsReconnecting(true);
      
      const wsUrl = new URL("/logs", process.env.NEXT_PUBLIC_BACKEND_URL || "");
      wsUrl.protocol = wsUrl.protocol.replace("http", "ws");
      
      logger.info("[SystemLogs] Connecting to logs WebSocket:", wsUrl.toString());
      const ws = new WebSocket(wsUrl.toString());
      wsRef.current = ws;

      ws.onopen = () => {
        if (!isMounted) {
          ws.close(1000, "Component unmounted");
          return;
        }

        logger.info("[SystemLogs] WebSocket connected");
        setIsConnected(true);
        setReconnectAttempts(0);
        setIsReconnecting(false);
        setError(null);

        clearInterval(pingInterval);
        pingInterval = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: "ping" }));
          }
        }, 15000);

        setLogs(prev => [...prev, {
          type: "system",
          message: "Connected to logging service",
          timestamp: new Date().toISOString(),
          level: "info"
        }]);
      };

      ws.onmessage = (event) => {
        if (!isMounted) return;

        try {
          const data = JSON.parse(event.data);
          if (data.type === "pong") return;
          
          setLogs(prev => [...prev, data]);
        } catch (error) {
          logger.error("[SystemLogs] Error parsing log message:", error);
          setError("Failed to parse log message");
        }
      };

      ws.onerror = (error) => {
        if (!isMounted) return;
        logger.error("[SystemLogs] WebSocket error:", error);
        setError("WebSocket connection error");
      };

      ws.onclose = (event) => {
        if (!isMounted) return;

        logger.info("[SystemLogs] WebSocket connection closed", event.code, event.reason);
        setIsConnected(false);
        wsRef.current = null;
        clearInterval(pingInterval);
        setIsReconnecting(false);

        if (event.code === 1000 && (
          event.reason === "Component unmounted" ||
          event.reason === "Creating new connection" ||
          event.reason === "New connection replacing old"
        )) {
          return;
        }

        if (reconnectAttempts < maxReconnectAttempts) {
          const nextAttempt = reconnectAttempts + 1;
          setReconnectAttempts(nextAttempt);
          const delay = Math.min(1000 * Math.pow(2, nextAttempt), 10000);
          
          logger.info(`[SystemLogs] Attempting to reconnect in ${delay}ms (Attempt ${nextAttempt}/${maxReconnectAttempts})`);
          
          setLogs(prev => [...prev, {
            type: "system",
            message: `Connection lost. Reconnecting in ${delay/1000}s (Attempt ${nextAttempt}/${maxReconnectAttempts})`,
            timestamp: new Date().toISOString(),
            level: "warn"
          }]);
          
          reconnectTimeout = setTimeout(connectWebSocket, delay);
        } else {
          setError("Maximum reconnection attempts reached");
          setLogs(prev => [...prev, {
            type: "system",
            message: "Max reconnection attempts reached. Please refresh the page.",
            timestamp: new Date().toISOString(),
            level: "error"
          }]);
        }
      };
    };

    // Load logs from localStorage on mount
    try {
      const savedLogs = localStorage.getItem('systemLogs');
      if (savedLogs) {
        setLogs(JSON.parse(savedLogs));
      }
    } catch (error) {
      logger.error('[SystemLogs] Error loading logs from localStorage:', error);
    }

    connectWebSocket();

    return () => {
      isMounted = false;
      clearTimeout(reconnectTimeout);
      clearInterval(pingInterval);
      
      if (wsRef.current) {
        wsRef.current.close(1000, "Component unmounted");
        wsRef.current = null;
      }
    };
  }, [reconnectAttempts, isReconnecting]);

  // Save logs to localStorage when updated
  useEffect(() => {
    try {
      localStorage.setItem('systemLogs', JSON.stringify(logs.slice(-1000))); // Keep last 1000 logs
    } catch (error) {
      logger.error('[SystemLogs] Error saving logs to localStorage:', error);
    }
  }, [logs]);

  const clearLogs = () => {
    setLogs([]);
    localStorage.removeItem('systemLogs');
  };

  const downloadLogs = (filteredLogs: LogMessage[]) => {
    const logText = filteredLogs
      .map(log => `[${log.timestamp}] [${log.type}] [${log.level}] ${log.message}`)
      .join('\n');
    
    const blob = new Blob([logText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `system-logs-${new Date().toISOString()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return [{
    logs,
    isConnected,
    stats,
    error,
    isReconnecting,
    reconnectAttempts
  }, {
    clearLogs,
    downloadLogs
  }];
} 