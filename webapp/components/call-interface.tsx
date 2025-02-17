"use client";

import React, { useState, useEffect } from 'react';
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Loader2 } from "lucide-react";
import { Item } from './types';
import { wsManager } from '@/lib/websocket-manager';
import handleRealtimeEvent from '@/lib/handle-realtime-event';
import { TopBar } from "@/components/console/TopBar";
import { SetupDialog } from "@/components/console/setup/SetupDialog";
import { SetupChecklist } from "@/components/console/setup/SetupChecklist";
import { TranscriptPanel } from "@/components/console/transcripts/TranscriptPanel";
import { FunctionCallsPanel } from "@/components/console/calls/FunctionCallsPanel";
import { ChecklistState } from '@/types/setup';

interface CallInterfaceProps {
  selectedPhoneNumber: string;
  allConfigsReady: boolean;
}

const CallInterface: React.FC<CallInterfaceProps> = ({ selectedPhoneNumber, allConfigsReady }) => {
  const [items, setItems] = useState<Item[]>([]);
  const [callStatus, setCallStatus] = useState("disconnected");
  const [error, setError] = useState<string | null>(null);
  const [localWs, setLocalWs] = useState<WebSocket | null>(null);

  useEffect(() => {
    if (!allConfigsReady) return;

    wsManager.connect();
    
    const unsubscribe = wsManager.subscribe((data) => {
      try {
        console.log("Received logs event:", data);
        handleRealtimeEvent(data, setItems);
      } catch (error) {
        console.error("Error processing websocket message:", error);
        setError("Failed to process message");
      }
    });

    return () => {
      unsubscribe();
    };
  }, [allConfigsReady]);

  useEffect(() => {
    setLocalWs(wsManager.isConnected ? new WebSocket(process.env.NEXT_PUBLIC_BACKEND_URL || '') : null);
  }, [wsManager.isConnected]);

  const { isConnected, isReconnecting, reconnectAttempt } = wsManager.connectionState;

  const checklistState: ChecklistState = {
    hasCredentials: true,
    phoneNumbers: [],
    currentNumberSid: '',
    currentVoiceUrl: '',
    publicUrl: '',
    localServerUp: true,
    publicUrlAccessible: true,
    allChecksPassed: true,
    webhookLoading: false,
    ngrokLoading: false,
    isPolling: false
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
                {reconnectAttempt > 0 
                  ? `Reconnecting... (Attempt ${reconnectAttempt})`
                  : 'Connecting...'}
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}

      <div className="h-screen bg-white flex flex-col">
        <SetupDialog
          ready={allConfigsReady}
          setReady={(ready: boolean) => {
            if (ready) {
              wsManager.connect();
            } else {
              wsManager.disconnect();
            }
          }}
          selectedPhoneNumber={selectedPhoneNumber}
          setSelectedPhoneNumber={(phoneNumber: string) => {
            wsManager.disconnect();
            // Implement logic to update selectedPhoneNumber
          }}
        />
        <TopBar />
        <div className="flex-grow p-4 h-full overflow-hidden flex flex-col">
          <div className="grid grid-cols-12 gap-4 h-full">
            {/* Left Column */}
            <div className="col-span-3 flex flex-col h-full overflow-hidden">
              <SetupChecklist
                state={checklistState}
                onUpdateWebhook={async () => {}}
                onCheckNgrok={async () => {}}
                onNumberChange={() => {}}
                setSelectedPhoneNumber={() => {}}
              />
            </div>

            {/* Middle Column: Transcript and Status */}
            <div className="col-span-6 flex flex-col gap-4 h-full overflow-hidden">
              <TranscriptPanel items={items} />
            </div>

            {/* Right Column: Function Calls */}
            <div className="col-span-3 flex flex-col h-full overflow-hidden">
              <FunctionCallsPanel 
                items={items}
                ws={localWs}
              />
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default CallInterface;
