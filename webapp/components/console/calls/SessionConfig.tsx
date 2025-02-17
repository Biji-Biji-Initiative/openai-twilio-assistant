"use client";

import React from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Settings } from "lucide-react";

interface SessionConfigProps {
  callStatus: any;
  ws: WebSocket | null;
  selectedPhoneNumber: string;
  allConfigsReady: boolean;
  setAllConfigsReady: (ready: boolean) => void;
}

export function SessionConfig({
  callStatus,
  ws,
  selectedPhoneNumber,
  allConfigsReady,
  setAllConfigsReady,
}: SessionConfigProps) {
  const [config, setConfig] = React.useState({
    systemPrompt: "",
    assistantPrompt: "",
    maxTurns: "10",
    temperature: "0.7",
  });

  const handleSave = () => {
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: "session.update",
        session: config
      }));
    }
  };

  return (
    <Card className="p-4">
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          <h2 className="text-lg font-semibold">Session Config</h2>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="systemPrompt">System Prompt</Label>
            <Textarea
              id="systemPrompt"
              value={config.systemPrompt}
              onChange={(e) => setConfig({ ...config, systemPrompt: e.target.value })}
              placeholder="Enter system prompt..."
              className="h-24"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="assistantPrompt">Assistant Prompt</Label>
            <Textarea
              id="assistantPrompt"
              value={config.assistantPrompt}
              onChange={(e) => setConfig({ ...config, assistantPrompt: e.target.value })}
              placeholder="Enter assistant prompt..."
              className="h-24"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="maxTurns">Max Turns</Label>
              <Input
                id="maxTurns"
                type="number"
                value={config.maxTurns}
                onChange={(e) => setConfig({ ...config, maxTurns: e.target.value })}
                min="1"
                max="20"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="temperature">Temperature</Label>
              <Input
                id="temperature"
                type="number"
                value={config.temperature}
                onChange={(e) => setConfig({ ...config, temperature: e.target.value })}
                min="0"
                max="2"
                step="0.1"
              />
            </div>
          </div>

          <Button 
            onClick={handleSave}
            disabled={!ws || ws.readyState !== WebSocket.OPEN}
            className="w-full"
          >
            Save Configuration
          </Button>
        </div>
      </div>
    </Card>
  );
} 