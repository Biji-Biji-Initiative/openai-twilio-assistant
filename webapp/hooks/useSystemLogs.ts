import { useState, useEffect } from 'react';
import { logger } from '@/lib/logger';
import { wsManager, WebSocketMessage } from '@/lib/websocket-manager';

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
  const [error, setError] = useState<string | null>(null);

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
    // Load logs from localStorage on mount
    try {
      const savedLogs = localStorage.getItem('systemLogs');
      if (savedLogs) {
        setLogs(JSON.parse(savedLogs));
      }
    } catch (error) {
      logger.error('[SystemLogs] Error loading logs from localStorage:', error);
    }

    // Connect to WebSocket and set up message handler
    wsManager.connect();
    
    const unsubscribe = wsManager.subscribe((data: WebSocketMessage) => {
      if (data.type === "pong") return;
      
      setLogs(prev => [...prev, data as LogMessage]);
    });

    // Add connection established log
    setLogs(prev => [...prev, {
      type: "system",
      message: "Connected to logging service",
      timestamp: new Date().toISOString(),
      level: "info"
    }]);

    return () => {
      unsubscribe();
    };
  }, []);

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

  const { isConnected, isReconnecting, reconnectAttempt } = wsManager.connectionState;

  return [{
    logs,
    isConnected,
    stats,
    error,
    isReconnecting,
    reconnectAttempts: reconnectAttempt
  }, {
    clearLogs,
    downloadLogs
  }];
} 