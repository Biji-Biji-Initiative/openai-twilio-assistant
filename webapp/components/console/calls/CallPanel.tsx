"use client";

import React from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Loader2, Phone, PhoneOff } from "lucide-react";
import { TranscriptPanel } from '../transcripts/TranscriptPanel';
import { Item } from '@/components/types';

interface CallPanelProps {
  items: Item[];
  ws: WebSocket | null;
  error: string | null;
  isReconnecting: boolean;
  reconnectAttempts: number;
  selectedPhoneNumber: string;
}

export function CallPanel({
  items,
  ws,
  error,
  isReconnecting,
  reconnectAttempts,
  selectedPhoneNumber,
}: CallPanelProps) {
  const isConnected = ws?.readyState === WebSocket.OPEN;

  const handleCall = () => {
    if (isConnected && selectedPhoneNumber) {
      ws.send(JSON.stringify({
        type: "call.start",
        phoneNumber: selectedPhoneNumber
      }));
    }
  };

  const handleHangup = () => {
    if (isConnected) {
      ws.send(JSON.stringify({
        type: "call.end"
      }));
    }
  };

  return (
    <Card className="p-4">
      {/* Connection Status */}
      {(error || isReconnecting) && (
        <div className="mb-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {isReconnecting && (
            <Alert>
              <Loader2 className="h-4 w-4 animate-spin" />
              <AlertDescription>
                {reconnectAttempts > 0 
                  ? `Reconnecting... (Attempt ${reconnectAttempts})`
                  : 'Connecting...'}
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}

      {/* Call Controls */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Phone className="h-5 w-5" />
          Call Controls
        </h2>
        <div className="flex gap-2">
          <Button
            onClick={handleCall}
            disabled={!isConnected || !selectedPhoneNumber}
            className="bg-green-500 hover:bg-green-600"
          >
            <Phone className="h-4 w-4 mr-2" />
            Start Call
          </Button>
          <Button
            onClick={handleHangup}
            disabled={!isConnected}
            variant="destructive"
          >
            <PhoneOff className="h-4 w-4 mr-2" />
            End Call
          </Button>
        </div>
      </div>

      {/* Live Transcript */}
      <div className="mt-4">
        <TranscriptPanel items={items} />
      </div>
    </Card>
  );
} 