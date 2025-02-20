"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CallInterface from "./call-interface";
import ConversationHistory from "./conversation-history";
import PromptsManager from "./prompts-manager";
import { Phone, MessageSquare, ListPlus } from "lucide-react";

export default function MainTabs() {
  const [allConfigsReady, setAllConfigsReady] = useState(false);
  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b">
        <h1 className="text-xl font-semibold">OpenAI Call Assistant</h1>
      </div>
      <Tabs defaultValue="calls" className="flex-1 container mx-auto">
        <TabsList className="flex justify-center gap-1 p-1 mb-4 bg-white border rounded-lg shadow-sm">
          <TabsTrigger value="calls" className="flex-1 py-2">
            <Phone className="w-4 h-4 mr-2" />
            Calls
          </TabsTrigger>
          <TabsTrigger value="history" className="flex-1 py-2">
            <MessageSquare className="w-4 h-4 mr-2" />
            History
          </TabsTrigger>
          <TabsTrigger value="prompts" className="flex-1 py-2">
            <ListPlus className="w-4 h-4 mr-2" />
            Prompts
          </TabsTrigger>
        </TabsList>
        <TabsContent value="calls" className="outline-none">
          <CallInterface allConfigsReady={allConfigsReady} setAllConfigsReady={setAllConfigsReady} />
        </TabsContent>
        <TabsContent value="history" className="outline-none">
          <ConversationHistory />
        </TabsContent>
        <TabsContent value="prompts" className="outline-none">
          <PromptsManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}
