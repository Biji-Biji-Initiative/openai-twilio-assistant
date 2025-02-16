"use client";

import React, { useEffect, useState, useRef, useMemo } from 'react';
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, X, Download, Filter, Clock, BarChart2, RefreshCcw } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface LogMessage {
  type: string;
  message: string;
  timestamp: string;
  level?: string;
}

interface LogStats {
  total: number;
  byLevel: Record<string, number>;
  byType: Record<string, number>;
  errorRate: string;
  lastError?: string;
  recentActivity: number;
}

const StatusPanel: React.FC = () => {
  const [logs, setLogs] = useState<LogMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLevel, setSelectedLevel] = useState<string>("all");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [timeFilter, setTimeFilter] = useState<string>("all");
  const [autoScroll, setAutoScroll] = useState(true);
  const [showStats, setShowStats] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // Store logs in localStorage when updated
  useEffect(() => {
    try {
      localStorage.setItem('systemLogs', JSON.stringify(logs.slice(-1000))); // Keep last 1000 logs
    } catch (error) {
      console.error('Error saving logs to localStorage:', error);
    }
  }, [logs]);

  // Load logs from localStorage on mount
  useEffect(() => {
    try {
      const savedLogs = localStorage.getItem('systemLogs');
      if (savedLogs) {
        setLogs(JSON.parse(savedLogs));
      }
    } catch (error) {
      console.error('Error loading logs from localStorage:', error);
    }
  }, []);

  useEffect(() => {
    let reconnectTimeout: NodeJS.Timeout;
    const maxReconnectAttempts = 5;
    let reconnectAttempts = 0;

    const connectWebSocket = () => {
      // Use environment variable for WebSocket URL
      const wsUrl = new URL("/logs", process.env.NEXT_PUBLIC_BACKEND_URL || "");
      wsUrl.protocol = wsUrl.protocol.replace("http", "ws");
      
      console.log("[StatusPanel] Connecting to logs WebSocket:", wsUrl.toString());
      const ws = new WebSocket(wsUrl.toString());
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("[StatusPanel] WebSocket connected");
        setIsConnected(true);
        reconnectAttempts = 0; // Reset reconnect attempts on successful connection
        setLogs(prev => [...prev, {
          type: "system",
          message: "Connected to logging service",
          timestamp: new Date().toISOString(),
          level: "info"
        }]);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setLogs(prev => [...prev, data]);
          
          if (autoScroll && scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
          }
        } catch (error) {
          console.error("[StatusPanel] Error parsing log message:", error);
          setLogs(prev => [...prev, {
            type: "system",
            message: `Error parsing log message: ${error}`,
            timestamp: new Date().toISOString(),
            level: "error"
          }]);
        }
      };

      ws.onerror = (error) => {
        console.error("[StatusPanel] WebSocket error:", error);
        setLogs(prev => [...prev, {
          type: "system",
          message: `WebSocket error occurred: ${error}`,
          timestamp: new Date().toISOString(),
          level: "error"
        }]);
      };

      ws.onclose = (event) => {
        console.log("[StatusPanel] WebSocket connection closed", event.code, event.reason);
        setIsConnected(false);
        setLogs(prev => [...prev, {
          type: "system",
          message: `Disconnected from logging service (Code: ${event.code}, Reason: ${event.reason || 'No reason provided'})`,
          timestamp: new Date().toISOString(),
          level: "warn"
        }]);

        // Attempt to reconnect if not at max attempts
        if (reconnectAttempts < maxReconnectAttempts) {
          reconnectAttempts++;
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 10000); // Exponential backoff with 10s max
          console.log(`[StatusPanel] Attempting to reconnect in ${delay}ms (Attempt ${reconnectAttempts}/${maxReconnectAttempts})`);
          reconnectTimeout = setTimeout(connectWebSocket, delay);
        } else {
          console.log("[StatusPanel] Max reconnection attempts reached");
          setLogs(prev => [...prev, {
            type: "system",
            message: "Max reconnection attempts reached. Please refresh the page.",
            timestamp: new Date().toISOString(),
            level: "error"
          }]);
        }
      };

      // Set up ping/pong to keep connection alive
      const pingInterval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "ping" }));
        }
      }, 30000); // Send ping every 30 seconds

      return () => {
        clearInterval(pingInterval);
      };
    };

    connectWebSocket();

    // Cleanup on unmount
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
    };
  }, [autoScroll]);

  const filteredLogs = useMemo(() => {
    const now = new Date().getTime();
    return logs.filter(log => {
      const matchesSearch = searchTerm === "" || 
        log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.type.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesLevel = selectedLevel === "all" || log.level === selectedLevel;
      const matchesType = selectedType === "all" || log.type === selectedType;
      
      // Time-based filtering
      const logTime = new Date(log.timestamp).getTime();
      const matchesTime = timeFilter === "all" || (() => {
        switch (timeFilter) {
          case "1m": return now - logTime <= 60 * 1000;
          case "5m": return now - logTime <= 5 * 60 * 1000;
          case "15m": return now - logTime <= 15 * 60 * 1000;
          case "1h": return now - logTime <= 60 * 60 * 1000;
          default: return true;
        }
      })();
      
      return matchesSearch && matchesLevel && matchesType && matchesTime;
    });
  }, [logs, searchTerm, selectedLevel, selectedType, timeFilter]);

  const stats: LogStats = useMemo(() => {
    const now = new Date().getTime();
    const byLevel: Record<string, number> = {};
    const byType: Record<string, number> = {};
    let lastError: string | undefined;
    let recentCount = 0;

    logs.forEach(log => {
      // Count by level
      byLevel[log.level || 'unknown'] = (byLevel[log.level || 'unknown'] || 0) + 1;
      
      // Count by type
      byType[log.type] = (byType[log.type] || 0) + 1;
      
      // Track last error
      if (log.level === 'error') {
        lastError = log.message;
      }

      // Count recent activity (last minute)
      if (now - new Date(log.timestamp).getTime() <= 60 * 1000) {
        recentCount++;
      }
    });

    const errorRate = ((byLevel['error'] || 0) / logs.length * 100).toFixed(1);

    return {
      total: logs.length,
      byLevel,
      byType,
      errorRate: `${errorRate}%`,
      lastError,
      recentActivity: recentCount
    };
  }, [logs]);

  // Function to get appropriate color for log level
  const getLogColor = (level?: string) => {
    switch (level?.toLowerCase()) {
      case 'error':
        return 'text-red-500';
      case 'warn':
        return 'text-yellow-500';
      case 'info':
        return 'text-blue-500';
      case 'debug':
        return 'text-gray-500';
      default:
        return 'text-gray-700';
    }
  };

  const downloadLogs = () => {
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

  const clearLogs = () => {
    setLogs([]);
    localStorage.removeItem('systemLogs');
  };

  const refreshLogs = () => {
    setTimeFilter("all");
    setSelectedLevel("all");
    setSelectedType("all");
    setSearchTerm("");
  };

  return (
    <Card className="w-full h-[300px] bg-gray-50">
      <div className="p-2 border-b">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold">System Logs</h3>
            <Button
              variant="ghost"
              size="sm"
              className="h-6"
              onClick={() => setShowStats(!showStats)}
            >
              <BarChart2 className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">
              {stats.recentActivity} events/min
            </span>
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-xs text-gray-500">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>

        {showStats && (
          <div className="mb-2 p-2 bg-gray-100 rounded text-xs">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <div className="font-semibold">Total Logs</div>
                <div>{stats.total}</div>
              </div>
              <div>
                <div className="font-semibold">Error Rate</div>
                <div className="text-red-500">{stats.errorRate}</div>
              </div>
              <div>
                <div className="font-semibold">Last Error</div>
                <div className="truncate text-red-500">{stats.lastError || 'None'}</div>
              </div>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-4">
              <div>
                <div className="font-semibold mb-1">By Level</div>
                <div className="grid grid-cols-2 gap-1">
                  {Object.entries(stats.byLevel).map(([level, count]) => (
                    <div key={level} className="flex justify-between">
                      <span>{level}:</span>
                      <span>{count}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <div className="font-semibold mb-1">By Type</div>
                <div className="grid grid-cols-2 gap-1">
                  {Object.entries(stats.byType).map(([type, count]) => (
                    <div key={type} className="flex justify-between">
                      <span>{type}:</span>
                      <span>{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
        
        <div className="flex items-center gap-2 mb-2">
          <div className="flex-1 relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search logs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-2 top-2.5"
              >
                <X className="h-4 w-4 text-gray-400" />
              </button>
            )}
          </div>
          
          <Select value={selectedLevel} onValueChange={setSelectedLevel}>
            <SelectTrigger className="w-[100px]">
              <SelectValue placeholder="Level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Levels</SelectItem>
              <SelectItem value="error">Error</SelectItem>
              <SelectItem value="warn">Warning</SelectItem>
              <SelectItem value="info">Info</SelectItem>
              <SelectItem value="debug">Debug</SelectItem>
            </SelectContent>
          </Select>

          <Select value={selectedType} onValueChange={setSelectedType}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {Object.keys(stats.byType).map(type => (
                <SelectItem key={type} value={type}>{type}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={timeFilter} onValueChange={setTimeFilter}>
            <SelectTrigger className="w-[100px]">
              <Clock className="h-4 w-4 mr-1" />
              <SelectValue placeholder="Time" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="1m">Last Minute</SelectItem>
              <SelectItem value="5m">Last 5 Min</SelectItem>
              <SelectItem value="15m">Last 15 Min</SelectItem>
              <SelectItem value="1h">Last Hour</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="icon"
            onClick={downloadLogs}
            title="Download Logs"
          >
            <Download className="h-4 w-4" />
          </Button>

          <Button
            variant="outline"
            size="icon"
            onClick={clearLogs}
            title="Clear Logs"
          >
            <X className="h-4 w-4" />
          </Button>

          <Button
            variant="outline"
            size="icon"
            onClick={refreshLogs}
            title="Reset Filters"
          >
            <RefreshCcw className="h-4 w-4" />
          </Button>

          <Button
            variant={autoScroll ? "default" : "outline"}
            size="sm"
            onClick={() => setAutoScroll(!autoScroll)}
            title="Toggle Auto-scroll"
          >
            Auto-scroll
          </Button>
        </div>
      </div>

      <ScrollArea className="h-[200px] p-2" ref={scrollRef}>
        {filteredLogs.length > 0 ? (
          filteredLogs.map((log, index) => (
            <div 
              key={index} 
              className={`text-xs font-mono py-1 ${getLogColor(log.level)}`}
            >
              <span className="text-gray-400">
                {new Date(log.timestamp).toLocaleTimeString()}
              </span>
              {' '}
              <span className="font-semibold">[{log.type}]</span>
              {' '}
              <span className="font-semibold">[{log.level}]</span>
              {' '}
              {log.message}
            </div>
          ))
        ) : (
          <div className="text-center text-gray-500 mt-4">
            No logs match the current filters
          </div>
        )}
      </ScrollArea>
    </Card>
  );
};

export default StatusPanel; 