"use client";

import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Phone, MessageSquare, Terminal, PhoneCall } from "lucide-react";
import { useWebSocket } from "@/hooks/useWebSocket";
import { SetupDialog } from "../setup/SetupDialog";
import { TopBar } from "../TopBar";
import { CallsTab } from "./CallsTab";
import { TranscriptsTab } from "./TranscriptsTab";
import { DevPhoneTab } from "./DevPhoneTab";
import { LogsTab } from "./LogsTab";

interface ConsoleTabsProps {
  ready: boolean;
  setReady: (ready: boolean) => void;
  selectedPhoneNumber: string;
  setSelectedPhoneNumber: (phoneNumber: string) => void;
}

export function ConsoleTabs({
  ready,
  setReady,
  selectedPhoneNumber,
  setSelectedPhoneNumber,
}: ConsoleTabsProps) {
  const { items, ws, callStatus, error, isReconnecting, reconnectAttempts } = useWebSocket(ready);
  const [allConfigsReady, setAllConfigsReady] = React.useState(ready);

  return (
    <div className="h-screen flex flex-col">
      <TopBar />
      
      {/* Setup Dialog */}
      <SetupDialog
        ready={ready}
        setReady={setReady}
        selectedPhoneNumber={selectedPhoneNumber}
        setSelectedPhoneNumber={setSelectedPhoneNumber}
      />

      <div className="flex-1 p-4">
        <Tabs defaultValue="calls" className="h-full">
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
          </div>

          <Card className="mt-2">
            <TabsContent value="calls" className="mt-0">
              <CallsTab 
                callStatus={callStatus}
                items={items}
                ws={ws}
                error={error}
                isReconnecting={isReconnecting}
                reconnectAttempts={reconnectAttempts}
                selectedPhoneNumber={selectedPhoneNumber}
                allConfigsReady={allConfigsReady}
                setAllConfigsReady={setAllConfigsReady}
              />
            </TabsContent>

            <TabsContent value="transcripts" className="mt-0">
              <TranscriptsTab items={items} />
            </TabsContent>

            <TabsContent value="devphone" className="mt-0">
              <DevPhoneTab />
            </TabsContent>

            <TabsContent value="logs" className="mt-0">
              <LogsTab />
            </TabsContent>
          </Card>
        </Tabs>
      </div>
    </div>
  );
}