"use client";

import React from 'react';
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bot, User } from "lucide-react";
import { Item } from "@/components/types";

interface TranscriptPanelProps {
  items: Item[];
}

export function TranscriptPanel({ items }: TranscriptPanelProps) {
  const transcriptRef = React.useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  React.useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }, [items]);

  // Filter and transform items to messages
  const messages = React.useMemo(() => {
    return items
      .filter(item => item.type === "message" && Array.isArray(item.content))
      .map(item => ({
        id: item.id,
        role: item.role || "system",
        content: item.content?.map(c => c.text).join(" ") || "",
        timestamp: item.timestamp || new Date().toISOString()
      }));
  }, [items]);

  return (
    <Card className="h-full flex flex-col">
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold">Live Transcript</h2>
      </div>
      
      <ScrollArea ref={transcriptRef} className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className="flex gap-3 text-sm"
            >
              <div className="flex-none">
                {message.role === "assistant" ? (
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                    <User className="h-4 w-4 text-muted-foreground" />
                  </div>
                )}
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">
                    {message.role === "assistant" ? "Assistant" : "User"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(message.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <div className="text-sm text-muted-foreground">
                  {message.content}
                </div>
              </div>
            </div>
          ))}
          {messages.length === 0 && (
            <div className="text-center text-muted-foreground py-8">
              No messages yet
            </div>
          )}
        </div>
      </ScrollArea>
    </Card>
  );
}