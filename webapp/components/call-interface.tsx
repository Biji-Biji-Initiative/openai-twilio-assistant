"use client";

import React, { useState, useEffect } from "react";
import TopBar from "@/components/top-bar";
import ChecklistAndConfig from "@/components/checklist-and-config";
import SessionConfigurationPanel from "@/components/session-configuration-panel";
import Transcript from "@/components/transcript";
import FunctionCallsPanel from "@/components/function-calls-panel";
import { Item } from "@/components/types";
import handleRealtimeEvent from "@/lib/handle-realtime-event";
import PhoneNumberChecklist from "@/components/phone-number-checklist";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Phone, PhoneCall, PhoneOff } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const CallInterface = () => {
  const [items, setItems] = useState<Item[]>([]);
  const [callStatus, setCallStatus] = useState("disconnected");
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [outgoingNumber, setOutgoingNumber] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [wsStatus, setWsStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected');
  const [error, setError] = useState<string | null>(null);
  const [selectedPhoneNumber, setSelectedPhoneNumber] = useState("");
  const [allConfigsReady, setAllConfigsReady] = useState(false);
  
  // The number we're calling from (your Twilio number)
  const fromNumber = "+60393880542";

  useEffect(() => {
    connectWebSocket();
  }, []);

  const connectWebSocket = () => {
    try {
      setWsStatus('connecting');
      const newWs = new WebSocket("ws://localhost:8081/logs");

      newWs.onopen = () => {
        console.log("Connected to logs websocket");
        setWsStatus('connected');
        setError(null);
      };

      newWs.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log("Received logs event:", data);
          handleRealtimeEvent(data, setItems);
        } catch (err) {
          console.error('Error processing websocket message:', err);
        }
      };

      newWs.onclose = () => {
        console.log("Logs websocket disconnected");
        setWs(null);
        setWsStatus('disconnected');
        // Try to reconnect after 3 seconds
        setTimeout(connectWebSocket, 3000);
      };

      newWs.onerror = (err) => {
        console.error('WebSocket error:', err);
        setError('Failed to connect to server. Retrying...');
      };

      setWs(newWs);
    } catch (err) {
      console.error('Error creating WebSocket:', err);
      setError('Failed to create WebSocket connection');
      setWsStatus('disconnected');
    }
  };

  const initiateOutgoingCall = async () => {
    if (!outgoingNumber) {
      toast.error('Please enter a phone number to call');
      return;
    }

    // Format the phone number to E.164 format
    let formattedNumber = outgoingNumber.replace(/\D/g, '');
    if (!formattedNumber.startsWith('+')) {
      formattedNumber = '+' + formattedNumber;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/call', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: fromNumber,
          to: formattedNumber
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to initiate call');
      }
      
      // Save to conversation history
      const conversations = JSON.parse(localStorage.getItem('conversations') || '[]');
      conversations.unshift({
        id: data.callSid,
        timestamp: new Date().toLocaleString(),
        duration: 'Ongoing',
        transcript: [`Outgoing call to ${formattedNumber}`],
      });
      localStorage.setItem('conversations', JSON.stringify(conversations));
      
      toast.success('Call initiated successfully');
      setCallStatus('connecting');
    } catch (error) {
      console.error('Error initiating call:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setError(`Failed to initiate call: ${errorMessage}`);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full gap-4 p-4">
      <div className="flex flex-col gap-4 p-6 bg-white rounded-lg shadow-sm border">
        {/* Phone Number Display */}
        <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-blue-500" />
            <span className="text-sm font-medium text-blue-700">Your Twilio Number:</span>
            <code className="px-2 py-1 bg-white rounded border border-blue-200 text-sm">
              {fromNumber}
            </code>
          </div>
        </div>
        {/* Connection Status */}
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
          <div className="flex items-center gap-2">
            <div className="font-medium">Server Status:</div>
            <div className="flex items-center gap-2">
              {wsStatus === 'connected' ? (
                <>
                  <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-green-600">Connected</span>
                </>
              ) : wsStatus === 'connecting' ? (
                <>
                  <div className="h-2 w-2 rounded-full bg-yellow-500 animate-pulse" />
                  <span className="text-yellow-600">Connecting...</span>
                </>
              ) : (
                <>
                  <div className="h-2 w-2 rounded-full bg-red-500" />
                  <span className="text-red-600">Disconnected</span>
                </>
              )}
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={connectWebSocket}
            disabled={wsStatus === 'connecting'}
          >
            {wsStatus === 'connecting' ? 'Connecting...' : 'Reconnect'}
          </Button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg">
            {error}
          </div>
        )}

        {/* Call Controls */}
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Enter Phone Number
            </label>
            <Input
              type="tel"
              placeholder="Enter phone number to call"
              value={outgoingNumber}
              onChange={(e) => setOutgoingNumber(e.target.value)}
              className="w-full"
              disabled={isLoading || callStatus === 'connected' || wsStatus !== 'connected'}
            />
          </div>
          <div className="flex-shrink-0 pt-6">
            <Button
              onClick={initiateOutgoingCall}
              disabled={!outgoingNumber || callStatus === 'connected' || isLoading || wsStatus !== 'connected'}
              variant={callStatus === 'connected' ? 'destructive' : 'default'}
              className="w-[120px]"
            >
              {isLoading ? (
                <>
                  <Phone className="mr-2 h-4 w-4 animate-spin" />
                  Calling...
                </>
              ) : callStatus === 'connected' ? (
                <>
                  <PhoneOff className="mr-2 h-4 w-4" />
                  End Call
                </>
              ) : (
                <>
                  <Phone className="mr-2 h-4 w-4" />
                  Call
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Call Status */}
        {callStatus !== 'disconnected' && (
          <div className="p-3 bg-gray-50 rounded-lg border">
            <div className="flex items-center gap-2">
              <div className="font-medium">Call Status:</div>
              {callStatus === 'connected' ? (
                <span className="text-green-600 flex items-center gap-1">
                  <PhoneCall className="h-4 w-4" />
                  Active Call
                </span>
              ) : (
                <span className="text-yellow-600 flex items-center gap-1">
                  <Phone className="h-4 w-4 animate-pulse" />
                  Connecting Call...
                </span>
              )}
            </div>
          </div>
        )}
      </div>
      
      <ChecklistAndConfig setSelectedPhoneNumber={setSelectedPhoneNumber} />
      <TopBar />
      <div className="flex-grow p-4 h-full overflow-hidden flex flex-col">
        <div className="grid grid-cols-12 gap-4 h-full">
          {/* Left Column */}
          <div className="col-span-3 flex flex-col h-full overflow-hidden">
            <SessionConfigurationPanel
              callStatus={callStatus}
              onSave={(config) => {
                if (ws && ws.readyState === WebSocket.OPEN) {
                  const updateEvent = {
                    type: "session.update",
                    session: {
                      ...config,
                    },
                  };
                  console.log("Sending update event:", updateEvent);
                  ws.send(JSON.stringify(updateEvent));
                }
              }}
            />
          </div>

          {/* Middle Column: Transcript */}
          <div className="col-span-6 flex flex-col gap-4 h-full overflow-hidden">
            <PhoneNumberChecklist
              selectedPhoneNumber={selectedPhoneNumber}
              allConfigsReady={allConfigsReady}
              setAllConfigsReady={setAllConfigsReady}
            />
            <Transcript items={items} />
          </div>

          {/* Right Column: Function Calls */}
          <div className="col-span-3 flex flex-col h-full overflow-hidden">
            <FunctionCallsPanel items={items} ws={ws} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default CallInterface;
