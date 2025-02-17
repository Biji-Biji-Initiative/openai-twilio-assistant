"use client";

import React from 'react';
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, X, Download, Clock, BarChart2, RefreshCcw } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSystemLogs } from '@/hooks/useSystemLogs';

export function LogPanel() {
  const [
    {
      logs: allLogs,
      isConnected,
      stats,
      error,
      isReconnecting,
      reconnectAttempts
    },
    {
      clearLogs,
      downloadLogs
    }
  ] = useSystemLogs();

  const [searchTerm, setSearchTerm] = React.useState("");
  const [selectedLevel, setSelectedLevel] = React.useState("all");
  const [selectedType, setSelectedType] = React.useState("all");
  const [timeFilter, setTimeFilter] = React.useState("all");
  const [showStats, setShowStats] = React.useState(false);

  // Filter logs based on search and filters
  const filteredLogs = React.useMemo(() => {
    const now = new Date().getTime();
    return allLogs.filter(log => {
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
  }, [allLogs, searchTerm, selectedLevel, selectedType, timeFilter]);

  // Get the appropriate color for log level
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

  const refreshLogs = () => {
    setTimeFilter("all");
    setSelectedLevel("all");
    setSelectedType("all");
    setSearchTerm("");
  };

  return (
    <Card className="h-full flex flex-col">
      <div className="p-4 border-b">
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
        
        <div className="flex items-center gap-2">
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
            onClick={() => downloadLogs(filteredLogs)}
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
        </div>
      </div>

      <ScrollArea className="flex-1 p-4">
        <div className="space-y-1">
          {error && (
            <div className="text-sm text-red-500 mb-2">
              Error: {error}
            </div>
          )}
          {filteredLogs.map((log, index) => (
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
          ))}
          {filteredLogs.length === 0 && (
            <div className="text-center text-gray-500 mt-4">
              No logs match the current filters
            </div>
          )}
        </div>
      </ScrollArea>
    </Card>
  );
} 