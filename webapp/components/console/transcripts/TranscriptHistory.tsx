"use client";

import React from 'react';
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Download, Search, MessageSquare, Copy } from "lucide-react";
import { useTranscripts } from '@/hooks/useTranscripts';
import { Item } from '@/components/types';
import { toast } from 'sonner';

interface TranscriptHistoryProps {
  items: Item[];
}

export function TranscriptHistory({ items }: TranscriptHistoryProps) {
  const [searchTerm, setSearchTerm] = React.useState("");
  const {
    conversations,
    selectedCallId,
    setSelectedCallId,
    copyTranscript,
    downloadTranscript,
    downloadAllTranscripts,
  } = useTranscripts(items);

  // Get the selected conversation and filter its transcripts based on search
  const selectedConversation = conversations.find(c => c.callId === selectedCallId);
  const filteredTranscripts = selectedConversation?.transcripts.filter(
    (t) => t.text.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const handleCopy = async (text: string) => {
    await copyTranscript(text);
    toast.success("Transcript copied to clipboard");
  };

  return (
    <Card className="h-full flex">
      {/* Left Panel - Conversation List */}
      <div className="w-64 border-r p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold">Conversations</h3>
          <Button
            variant="outline"
            size="sm"
            onClick={() => downloadAllTranscripts(conversations)}
            title="Download all transcripts"
          >
            <Download className="h-4 w-4" />
          </Button>
        </div>
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
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search transcripts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>

          <ScrollArea className="h-[calc(100vh-12rem)]">
            <div className="space-y-4">
              {filteredTranscripts.map((transcript) => (
                <Card key={transcript.id} className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        {new Date(transcript.timestamp).toLocaleString()}
                        {transcript.duration && ` • ${transcript.duration}`}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopy(transcript.text)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => downloadTranscript(
                          transcript.text,
                          transcript.callId,
                          transcript.timestamp
                        )}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{transcript.text}</p>
                </Card>
              ))}
              {filteredTranscripts.length === 0 && (
                <div className="text-center p-8 text-muted-foreground">
                  {conversations.length === 0
                    ? "No conversations found"
                    : "No matching transcripts found"}
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </div>
    </Card>
  );
}