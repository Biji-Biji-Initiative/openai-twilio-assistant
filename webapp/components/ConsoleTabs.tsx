"use client";

import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import CallInterface from "@/components/call-interface";
import DevPhone from "@/components/DevPhone";
import StatusPanel from "@/components/StatusPanel";
import TranscriptsPanel from "@/components/TranscriptsPanel";
import { Phone, MessageSquare, Settings, Terminal, PhoneCall, ListChecks } from "lucide-react";
import ChecklistAndConfig from "@/components/checklist-and-config";

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

      <Card className="mt-2 p-4">
        <TabsContent value="calls" className="mt-0">
          <CallInterface selectedPhoneNumber={selectedPhoneNumber} />
        </TabsContent>

        <TabsContent value="transcripts" className="mt-0">
          <div className="space-y-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Call Transcripts
            </h2>
            <TranscriptsPanel />
          </div>
        </TabsContent>

        <TabsContent value="devphone" className="mt-0">
          <DevPhone selectedPhoneNumber={selectedPhoneNumber} />
        </TabsContent>

        <TabsContent value="logs" className="mt-0">
          <StatusPanel />
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