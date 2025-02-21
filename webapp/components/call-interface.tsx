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

interface CallInterfaceProps {
  allConfigsReady: boolean;
  setAllConfigsReady: (ready: boolean) => void;
}

const CallInterface = ({ allConfigsReady, setAllConfigsReady }: CallInterfaceProps) => {
  const [items, setItems] = useState<Item[]>([]);
  const [callStatus, setCallStatus] = useState("disconnected");
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [outgoingNumber, setOutgoingNumber] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [wsStatus, setWsStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected');
  const [error, setError] = useState<string | null>(null);
  const [selectedPhoneNumber, setSelectedPhoneNumber] = useState("");
  const [currentCallSid, setCurrentCallSid] = useState<string | null>(null);
  // allConfigsReady is now passed as a prop
  const [checklistComplete, setChecklistComplete] = useState(false);
  
  // The number we're calling from (Twilio outbound number)
  const fromNumber = process.env.TWILIO_OUTBOUND_NUMBER || "+60393880542";
  
  // The number users call to reach the AI (Twilio inbound number)
  const inboundNumber = process.env.TWILIO_INBOUND_NUMBER || "60393880467";

  // Initialize WebSocket when configs are ready
  useEffect(() => {
    if (allConfigsReady && !ws && wsStatus === 'disconnected') {
      console.log('[WebSocket] Configs ready, initiating connection');
      connectWebSocket();
    }
  }, [allConfigsReady, wsStatus]);

  // Remove redundant effect

  const connectWebSocket = () => {
    // Prevent multiple connection attempts
    if (wsStatus === 'connecting' || wsStatus === 'connected') {
      console.log('[WebSocket] Connection already in progress or established');
      return;
    }

    console.log('[WebSocket] Initiating connection...');
    setWsStatus('connecting');
    setError(null);

    try {
      const ngrokDomain = process.env.NEXT_PUBLIC_NGROK_DOMAIN || 'mereka.ngrok.io';
      console.log('[WebSocket] Connecting to:', `wss://${ngrokDomain}/logs`);
      const newWs = new WebSocket(`wss://${ngrokDomain}/logs`);

      newWs.onopen = () => {
        console.log("[WebSocket] Connection established");
        setWsStatus('connected');
        setError(null);
        setWs(newWs);
        
        // Log connection success with timestamp
        console.log(`[WebSocket] Connected at ${new Date().toISOString()}`);
        
        // Send a test message to verify connection
        newWs.send(JSON.stringify({
          type: 'test',
          message: 'Testing WebSocket connection'
        }));
      };

      newWs.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          // Handle Twilio events
          if (data.type === 'twilio_event') {
            const twilioData = data.data;
            const eventType = twilioData.event;
            
            // Only log non-media events
            if (eventType !== 'media') {
              const timestamp = new Date().toISOString();
              console.group(`[Twilio Event: ${eventType}] at ${timestamp}`);
              console.log('Event data:', twilioData);
              console.groupEnd();
            }

            // Update state based on event type
            switch (eventType) {
              case 'media':
                setCallStatus('connected');
                break;
                
              case 'start':
                setCallStatus('connecting');
                setItems(prev => [...prev, {
                  id: `event-${Date.now()}`,
                  type: 'event',
                  content: [{ type: 'text', text: 'Call started' }],
                  timestamp: new Date().toLocaleTimeString()
                }]);
                break;
                
              case 'stop':
                setCallStatus('disconnected');
                setCurrentCallSid(null);
                setItems(prev => [...prev, {
                  id: `event-${Date.now()}`,
                  type: 'event',
                  content: [{ type: 'text', text: 'Call ended' }],
                  timestamp: new Date().toLocaleTimeString()
                }]);
                break;
                
              case 'status':
                // Update call status based on Twilio status
                const status = twilioData.status;
                if (status === 'initiated' || status === 'ringing') {
                  setCallStatus('connecting');
                } else if (status === 'in-progress') {
                  setCallStatus('connected');
                } else if (status === 'completed' || status === 'failed') {
                  setCallStatus('disconnected');
                  setCurrentCallSid(null);
                }
                
                setItems(prev => [...prev, {
                  id: `status-${Date.now()}`,
                  type: 'event',
                  content: [{ type: 'text', text: `Call status: ${status}` }],
                  timestamp: new Date().toLocaleTimeString()
                }]);
                break;
                
              case 'connected':
                setItems(prev => [...prev, {
                  id: `event-${Date.now()}`,
                  type: 'event',
                  content: [{ type: 'text', text: 'WebSocket connected to Twilio' }],
                  timestamp: new Date().toLocaleTimeString()
                }]);
                break;
                
              default:
                if (eventType !== 'media') {
                  setItems(prev => [...prev, {
                    id: `event-${Date.now()}`,
                    type: 'event',
                    content: [{ type: 'text', text: `Twilio event: ${eventType}` }],
                    timestamp: new Date().toLocaleTimeString()
                  }]);
                }
            }
          } else {
            // Handle model events
            handleRealtimeEvent(data, setItems);
          }
        } catch (err) {
          console.error('[WebSocket] Error processing message:', err);
          setItems(prev => [...prev, {
            id: `error-${Date.now()}`,
            type: 'error',
            content: [{ type: 'text', text: `Error: ${err.message}` }],
            timestamp: new Date().toLocaleTimeString()
          }]);
        }
      };

      newWs.onclose = () => {
        console.log("[WebSocket] Disconnected");
        setWs(null);
        setWsStatus('disconnected');
        // No auto-reconnect here - the useEffect will handle reconnection if needed
      };

      newWs.onerror = (err) => {
        const timestamp = new Date().toISOString();
        console.error(`[WebSocket] Error at ${timestamp}:`, err);
        setError('Failed to connect to server');
        setWsStatus('disconnected');
        setWs(null);
        // Log detailed error info
        console.group('[WebSocket] Connection Error Details');
        console.log('Timestamp:', timestamp);
        console.log('Status:', wsStatus);
        console.log('Has existing connection:', !!ws);
        console.groupEnd();
      };

      // setWs moved to onopen handler
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
      
      setCurrentCallSid(data.callSid);
      setCallStatus('connecting');
      
      // Add call initiation to logs
      setItems(prev => [...prev, {
        id: `call-${Date.now()}`,
        type: 'event',
        content: [{ type: 'text', text: `Initiating call to ${formattedNumber}` }],
        timestamp: new Date().toLocaleTimeString()
      }]);
      toast.success('Call initiated successfully');
    } catch (error) {
      console.error('Error initiating call:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setError(`Failed to initiate call: ${errorMessage}`);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleHangup = async () => {
    if (!currentCallSid) {
      toast.error('No active call to hang up');
      return;
    }
    
    try {
      const response = await fetch('/api/call/hangup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          callSid: currentCallSid,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to hang up call');
      }
      
      toast.success('Call ended successfully');
      setCallStatus('disconnected');
      setCurrentCallSid(null);
    } catch (error) {
      console.error('Error hanging up:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setError(`Failed to hang up call: ${errorMessage}`);
      toast.error(errorMessage);
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
              onClick={callStatus === 'connected' ? handleHangup : initiateOutgoingCall}
              disabled={(!outgoingNumber && callStatus !== 'connected') || isLoading || wsStatus !== 'connected'}
              variant={callStatus === 'connected' ? 'destructive' : 'default'}
              className="w-[120px]"
            >
              {isLoading ? (
                <>
                  <Phone className="mr-2 h-4 w-4 animate-spin" />
                  {callStatus === 'connected' ? 'Ending...' : 'Calling...'}
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
      
      <ChecklistAndConfig 
        setSelectedPhoneNumber={setSelectedPhoneNumber}
        setAllConfigsReady={setAllConfigsReady}
      />
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
