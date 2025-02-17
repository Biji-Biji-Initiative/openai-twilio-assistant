"use client";

import React from 'react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { LogMessage } from '@/hooks/useSystemLogs';

interface LogViewerProps {
  logs: LogMessage[];
  error: string | null;
}

export function LogViewer({ logs, error }: LogViewerProps) {
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

  return (
    <ScrollArea className="h-[calc(100vh-16rem)] p-2">
      {error && (
        <div className="text-sm text-red-500 mb-2 px-2">
          Error: {error}
        </div>
      )}
      {logs.length > 0 ? (
        logs.map((log, index) => (
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
  );
} 