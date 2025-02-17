"use client";

import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import SessionConfigurationPanel from "@/components/session-configuration-panel";
import DevPhone from "@/components/DevPhone";
import StatusPanel from "@/components/StatusPanel";
import TranscriptsPanel from "@/components/TranscriptsPanel";
import { Phone, MessageSquare, Terminal, PhoneCall, ListChecks } from "lucide-react";
import ChecklistAndConfig from "@/components/checklist-and-config";
import { useState } from "react";
import FunctionCallsPanel from "@/components/function-calls-panel";
import Transcript from "@/components/transcript";
import { Item } from "@/components/types";
import handleRealtimeEvent from "@/lib/handle-realtime-event";

interface ConsoleTabsProps {
  ready: boolean;
  setReady: (ready: boolean) => void;
  selectedPhoneNumber: string;
  setSelectedPhoneNumber: (number: string) => void;
}

export default function ConsoleTabs({
  ready,
  setReady,
  selectedPhoneNumber,
  setSelectedPhoneNumber,
}: ConsoleTabsProps) {
  const [callStatus, setCallStatus] = useState("disconnected");
  const [items, setItems] = useState<Item[]>([]);
  const [ws, setWs] = useState<WebSocket | null>(null);

  // Set up WebSocket connection
  React.useEffect(() => {
    if (ready && !ws) {
      const wsUrl = new URL("/logs", process.env.NEXT_PUBLIC_BACKEND_URL || "");
      wsUrl.protocol = wsUrl.protocol.replace("http", "ws");
      const newWs = new WebSocket(wsUrl.toString());

      newWs.onopen = () => {
        console.log("Connected to logs websocket");
        setCallStatus("connected");
      };

      newWs.onmessage = (event) => {
        const data = JSON.parse(event.data);
        console.log("Received logs event:", data);
        handleRealtimeEvent(data, setItems);
      };

      newWs.onclose = () => {
        console.log("Logs websocket disconnected");
        setWs(null);
        setCallStatus("disconnected");
      };

      setWs(newWs);
    }
  }, [ready, ws]);

  return (
    <Tabs defaultValue="calls" className="w-full">
      <div className="mb-6 flex justify-between items-center">
        <TabsList className="inline-flex h-10 items-center justify-center rounded-lg bg-muted p-1">
          <TabsTrigger 
            value="calls"
            className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
          >
            <Phone className="h-4 w-4" />
            Calls
          </TabsTrigger>
          <TabsTrigger 
            value="transcripts"
            className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
          >
            <MessageSquare className="h-4 w-4" />
            Transcripts
          </TabsTrigger>
          <TabsTrigger 
            value="devphone"
            className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
          >
            <PhoneCall className="h-4 w-4" />
            Dev Phone
          </TabsTrigger>
          <TabsTrigger 
            value="logs"
            className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
          >
            <Terminal className="h-4 w-4" />
            Logs
          </TabsTrigger>
        </TabsList>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setReady(false)}
          className="flex items-center gap-2"
        >
          <ListChecks className="h-4 w-4" />
          Setup Checklist
        </Button>
      </div>

      <Card className="mt-2">
        <TabsContent value="calls" className="mt-0">
          <div className="grid grid-cols-12 gap-4 p-4">
            {/* Left Column - Session Configuration */}
            <div className="col-span-3">
              <SessionConfigurationPanel
                callStatus={callStatus}
                onSave={(config) => {
                  if (ws && ws.readyState === WebSocket.OPEN) {
                    const updateEvent = {
                      type: "session.update",
                      session: config,
                    };
                    console.log("Sending update event:", updateEvent);
                    ws.send(JSON.stringify(updateEvent));
                  }
                }}
              />
            </div>

            {/* Middle Column - Call Controls & Transcript */}
            <div className="col-span-6">
              <div className="space-y-4 h-full">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <Phone className="h-5 w-5" />
                  Call Controls
                </h2>
                <div className="flex-grow overflow-hidden">
                  <Transcript items={items} />
                </div>
              </div>
            </div>

            {/* Right Column - Function Calls */}
            <div className="col-span-3">
              <FunctionCallsPanel items={items} ws={ws} />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="transcripts" className="mt-0">
          <div className="p-4">
            <h2 className="text-xl font-semibold flex items-center gap-2 mb-4">
              <MessageSquare className="h-5 w-5" />
              Call Transcripts
            </h2>
            <TranscriptsPanel />
          </div>
        </TabsContent>

        <TabsContent value="devphone" className="mt-0">
          <div className="p-4">
            <h2 className="text-xl font-semibold flex items-center gap-2 mb-4">
              <PhoneCall className="h-5 w-5" />
              Dev Phone
            </h2>
            <iframe 
              src="http://localhost:3001" 
              className="w-full h-[600px] border rounded-lg"
              title="Twilio Dev Phone"
            />
          </div>
        </TabsContent>

        <TabsContent value="logs" className="mt-0">
          <div className="p-4">
            <h2 className="text-xl font-semibold flex items-center gap-2 mb-4">
              <Terminal className="h-5 w-5" />
              System Logs
            </h2>
            <StatusPanel />
          </div>
        </TabsContent>
      </Card>

      <ChecklistAndConfig
        ready={ready}
        setReady={setReady}
        selectedPhoneNumber={selectedPhoneNumber}
        setSelectedPhoneNumber={setSelectedPhoneNumber}
      />
    </Tabs>
  );
} 