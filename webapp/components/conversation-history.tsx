"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Conversation {
  id: string;
  timestamp: string;
  duration: string;
  transcript: string[];
}

export default function ConversationHistory() {
  const [conversations, setConversations] = useState<Conversation[]>([]);

  useEffect(() => {
    // In a real implementation, we would load this from local storage or a backend
    const loadConversations = () => {
      const savedConversations = localStorage.getItem("conversations");
      if (savedConversations) {
        setConversations(JSON.parse(savedConversations));
      }
    };
    loadConversations();
  }, []);

  return (
    <div className="p-4 h-full">
      <h2 className="text-2xl font-bold mb-4">Conversation History</h2>
      <ScrollArea className="h-[calc(100vh-150px)]">
        {conversations.length === 0 ? (
          <p className="text-muted-foreground">No conversations yet</p>
        ) : (
          conversations.map((conversation) => (
            <Card key={conversation.id} className="mb-4">
              <CardHeader>
                <CardTitle>Call on {conversation.timestamp}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Duration: {conversation.duration}
                </p>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[200px]">
                  {conversation.transcript.map((line, index) => (
                    <p key={index} className="mb-2">
                      {line}
                    </p>
                  ))}
                </ScrollArea>
              </CardContent>
            </Card>
          ))
        )}
      </ScrollArea>
    </div>
  );
}
