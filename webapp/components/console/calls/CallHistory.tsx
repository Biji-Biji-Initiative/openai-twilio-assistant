"use client";

import React from 'react';
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Download, Search, Phone } from "lucide-react";
import { Item } from '@/components/types';

interface CallHistoryProps {
  items: Item[];
}

export function CallHistory({ items }: CallHistoryProps) {
  const [searchTerm, setSearchTerm] = React.useState("");

  // Transform items into call history
  const calls = React.useMemo(() => {
    return items
      .filter(item => item.type === "call_status")
      .map(item => ({
        id: item.id || "",
        phoneNumber: item.phoneNumber || "Unknown",
        status: item.status || "Unknown",
        timestamp: item.timestamp || new Date().toISOString(),
        duration: item.duration || "0:00"
      }))
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [items]);

  // Filter calls based on search
  const filteredCalls = React.useMemo(() => {
    return calls.filter(call => 
      call.phoneNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      call.status.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [calls, searchTerm]);

  const downloadHistory = () => {
    const content = calls.map(call => 
      `${call.timestamp} - ${call.phoneNumber} - ${call.status} - ${call.duration}`
    ).join('\n');

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `call-history-${new Date().toISOString()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Get the appropriate color for call status
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "completed":
        return "text-green-500";
      case "failed":
      case "busy":
      case "no-answer":
        return "text-red-500";
      case "in-progress":
        return "text-blue-500";
      default:
        return "text-gray-500";
    }
  };

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Call History</h2>
        <Button
          variant="outline"
          size="sm"
          onClick={downloadHistory}
          className="flex items-center gap-2"
        >
          <Download className="h-4 w-4" />
          Export
        </Button>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search calls..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-8"
        />
      </div>

      <ScrollArea className="h-[400px]">
        <div className="space-y-2">
          {filteredCalls.map((call) => (
            <div
              key={call.id}
              className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent/5 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="font-medium">{call.phoneNumber}</div>
                  <div className="text-sm text-muted-foreground">
                    {new Date(call.timestamp).toLocaleString()}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className={`text-sm font-medium ${getStatusColor(call.status)}`}>
                  {call.status}
                </div>
                <div className="text-sm text-muted-foreground">{call.duration}</div>
              </div>
            </div>
          ))}
          {filteredCalls.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No calls found
            </div>
          )}
        </div>
      </ScrollArea>
    </Card>
  );
} 