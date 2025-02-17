"use client";

import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Copy, Download, Search, MessageSquare } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Item } from "@/components/types";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Transcript {
  id: string;
  callId: string;
  timestamp: string;
  duration: string;
  text: string;
}

interface Conversation {
  callId: string;
  timestamp: string;
  transcripts: Transcript[];
}

interface TranscriptsPanelProps {
  items?: Item[];
}

export default function TranscriptsPanel({ items = [] }: TranscriptsPanelProps) {
  const [selectedCallId, setSelectedCallId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  // Transform items into conversations using useMemo
  const conversations = useMemo(() => {
    const transcripts = items
      .filter((item) => item.type === "message" && Array.isArray(item.content))
      .map((item, index) => {
        const messageText = item.content
          ?.map(content => content.text)
          .filter(Boolean)
          .join(" ");

        return {
          id: item.id || `transcript-${index}`,
          callId: item.call_id || "unknown",
          timestamp: item.timestamp || new Date().toISOString(),
          duration: "N/A",
          text: messageText || "",
        };
      })
      .filter(transcript => transcript.text.trim() !== "");

    // Group transcripts by callId
    const groupedTranscripts = transcripts.reduce((acc, transcript) => {
      const existing = acc.find(c => c.callId === transcript.callId);
      if (existing) {
        existing.transcripts.push(transcript);
        return acc;
      }
      return [...acc, {
        callId: transcript.callId,
        timestamp: transcript.timestamp,
        transcripts: [transcript],
      }];
    }, [] as Conversation[]);

    // Sort conversations by timestamp, newest first
    return groupedTranscripts.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [items]);

  // Handle initial selection in useEffect
  React.useEffect(() => {
    if (!selectedCallId && conversations.length > 0) {
      setSelectedCallId(conversations[0].callId);
    }
  }, [conversations.length]);

  const selectedConversation = conversations.find(c => c.callId === selectedCallId);
  const filteredTranscripts = selectedConversation?.transcripts.filter(
    (t) => t.text.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  return (
    <div className="h-full flex">
      {/* Left Panel - Conversation List */}
      <div className="w-64 border-r p-4">
        <h2 className="text-sm font-semibold mb-4">Conversations</h2>
        <ScrollArea className="h-[calc(100vh-12rem)]">
          <div className="space-y-2">
            {conversations.map((conversation) => (
              <Button
                key={conversation.callId}
                variant={selectedCallId === conversation.callId ? "secondary" : "ghost"}
                className="w-full justify-start"
                onClick={() => setSelectedCallId(conversation.callId)}
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                <div className="truncate text-left">
                  <div className="font-medium">Call {conversation.callId.slice(-4)}</div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(conversation.timestamp).toLocaleString()}
                  </div>
                </div>
              </Button>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Right Panel - Transcripts */}
      <div className="flex-1 p-4">
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search transcripts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Export All
            </Button>
          </div>

          <ScrollArea className="h-[calc(100vh-12rem)]">
            {filteredTranscripts.length > 0 ? (
              <div className="space-y-4">
                {filteredTranscripts.map((transcript) => (
                  <Card key={transcript.id} className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="text-sm text-muted-foreground">
                          {new Date(transcript.timestamp).toLocaleString()} • {transcript.duration}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigator.clipboard.writeText(transcript.text)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const element = document.createElement("a");
                            const file = new Blob([transcript.text], { type: "text/plain" });
                            element.href = URL.createObjectURL(file);
                            element.download = `transcript-${transcript.callId}-${transcript.timestamp}.txt`;
                            document.body.appendChild(element);
                            element.click();
                            document.body.removeChild(element);
                          }}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{transcript.text}</p>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center p-8">
                <p className="text-muted-foreground">
                  {conversations.length === 0
                    ? "No conversations found"
                    : "No matching transcripts found"}
                </p>
              </div>
            )}
          </ScrollArea>
        </div>
      </div>
    </div>
  );
} 