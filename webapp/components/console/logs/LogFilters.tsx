"use client";

import React from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, X, Download, Clock, BarChart2, RefreshCcw } from "lucide-react";
import { LogStats } from '@/hooks/useSystemLogs';

interface LogFiltersProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  selectedLevel: string;
  setSelectedLevel: (level: string) => void;
  selectedType: string;
  setSelectedType: (type: string) => void;
  timeFilter: string;
  setTimeFilter: (filter: string) => void;
  stats: LogStats;
  onClear: () => void;
  onDownload: () => void;
  onRefresh: () => void;
  showStats: boolean;
  setShowStats: (show: boolean) => void;
}

export function LogFilters({
  searchTerm,
  setSearchTerm,
  selectedLevel,
  setSelectedLevel,
  selectedType,
  setSelectedType,
  timeFilter,
  setTimeFilter,
  stats,
  onClear,
  onDownload,
  onRefresh,
  showStats,
  setShowStats,
}: LogFiltersProps) {
  return (
    <div className="space-y-4">
      {/* Stats Panel */}
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

      {/* Search and Filters */}
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
          onClick={onDownload}
          title="Download Logs"
        >
          <Download className="h-4 w-4" />
        </Button>

        <Button
          variant="outline"
          size="icon"
          onClick={onClear}
          title="Clear Logs"
        >
          <X className="h-4 w-4" />
        </Button>

        <Button
          variant="outline"
          size="icon"
          onClick={onRefresh}
          title="Reset Filters"
        >
          <RefreshCcw className="h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => setShowStats(!showStats)}
          title="Toggle Statistics"
        >
          <BarChart2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
} 