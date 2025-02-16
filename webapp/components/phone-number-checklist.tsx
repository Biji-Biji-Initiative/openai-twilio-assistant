// PhoneNumberChecklist.tsx
"use client";

import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { CheckCircle, Circle, Eye, EyeOff, Phone, PhoneOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type PhoneNumberChecklistProps = {
  selectedPhoneNumber: string;
  allConfigsReady: boolean;
  setAllConfigsReady: (ready: boolean) => void;
};

const PhoneNumberChecklist: React.FC<PhoneNumberChecklistProps> = ({
  selectedPhoneNumber,
  allConfigsReady,
  setAllConfigsReady,
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [toNumber, setToNumber] = useState("+60122916662");
  const [isCallInProgress, setIsCallInProgress] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [error, setError] = useState("");
  const [callStatus, setCallStatus] = useState("Idle");
  const [currentCallSid, setCurrentCallSid] = useState<string | null>(null);
  const [callLog, setCallLog] = useState<string[]>([]);

  // Add log entry with timestamp and optional details
  const addLogEntry = (entry: string, details?: Record<string, any>) => {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${entry}${
      details ? `\n  ${JSON.stringify(details, null, 2)}` : ""
    }`;
    setCallLog(prev => [...prev, logEntry]);
    console.log(logEntry);
  };

  // Handle WebSocket status updates
  useEffect(() => {
    if (!allConfigsReady) return;

    const wsUrl = new URL("/logs", process.env.NEXT_PUBLIC_BACKEND_URL || "");
    wsUrl.protocol = wsUrl.protocol.replace("http", "ws");
    const ws = new WebSocket(wsUrl.toString());

    ws.onopen = () => {
      addLogEntry("WebSocket connection established");
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);

        if (msg.type === "call.status" && msg.callSid === currentCallSid) {
          const details = {
            status: msg.callStatus,
            duration: msg.duration,
            sequence: msg.sequence,
            direction: msg.direction,
            source: msg.source,
            timestamp: msg.eventTimestamp,
          };
          
          addLogEntry(`Call status update: ${msg.callStatus}`, details);
          setCallStatus(msg.callStatus);
          
          // Update call progress based on status
          if (msg.callStatus === "initiated") {
            setIsCallInProgress(true);
            setIsDisconnecting(false);
          } else if (["completed", "failed", "busy", "no-answer"].includes(msg.callStatus)) {
            setIsCallInProgress(false);
            setIsDisconnecting(false);
            if (msg.errorCode) {
              addLogEntry(`Error: ${msg.errorCode} - ${msg.errorMessage}`);
            }
            // Reset after a delay
            setTimeout(() => {
              setCallStatus("Idle");
              setCurrentCallSid(null);
            }, 5000);
          } else if (msg.callStatus === "ringing") {
            setIsDisconnecting(false);
          } else if (msg.callStatus === "in-progress") {
            setIsDisconnecting(false);
          }
        } else if (msg.type === "media") {
          addLogEntry("Received media event");
        } else if (msg.type === "mark" && msg.mark?.name === "clear_audio") {
          addLogEntry("Received clear audio mark");
        } else if (!msg.type) {
          addLogEntry(`Warning: Received message without type: ${JSON.stringify(msg)}`);
        }
      } catch (e) {
        console.error("[PhoneNumberChecklist] Error parsing WS message:", e);
        addLogEntry(`Error parsing WebSocket message: ${e}`);
      }
    };

    ws.onerror = (e) => {
      console.error("[PhoneNumberChecklist] WebSocket error:", e);
      addLogEntry(`WebSocket error: ${e}`);
    };

    ws.onclose = () => {
      addLogEntry("WebSocket connection closed");
    };

    return () => {
      ws.close();
    };
  }, [allConfigsReady, currentCallSid]);

  const makeCall = async () => {
    if (!toNumber) {
      setError("Please enter a phone number to call");
      return;
    }

    addLogEntry(`Initiating outbound call to: ${toNumber}`);
    setIsCallInProgress(true);
    setCallStatus("Dialing...");
    setError("");

    try {
      const response = await fetch("/api/outbound-call-proxy", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          to: toNumber,
        }),
      });

      const data = await response.json();
      addLogEntry(`Response from outbound call endpoint: ${JSON.stringify(data)}`);
      
      if (!response.ok) {
        throw new Error(data.error || "Failed to make call");
      }

      addLogEntry(`Call initiated successfully. SID: ${data.sid}`);
      setCallStatus("Initiating call...");
      setCurrentCallSid(data.sid);
    } catch (err) {
      console.error("[PhoneNumberChecklist] Error during call initiation:", err);
      addLogEntry(`Error during call initiation: ${err}`);
      setError(err instanceof Error ? err.message : "Failed to make call");
      setCallStatus("Error");
      setIsCallInProgress(false);
      setCurrentCallSid(null);
    }
  };

  const disconnectCall = async () => {
    if (!currentCallSid || isDisconnecting) return;

    setIsDisconnecting(true);
    addLogEntry(`Disconnecting call: ${currentCallSid}`);
    
    try {
      const response = await fetch("/api/outbound-call-proxy", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "disconnect",
          callSid: currentCallSid,
        }),
      });

      const data = await response.json();
      addLogEntry(`Response from disconnect endpoint: ${JSON.stringify(data)}`);
      
      if (!response.ok) {
        throw new Error(data.error || "Failed to disconnect call");
      }

      addLogEntry("Call disconnect request sent successfully");
      setCallStatus("Disconnecting...");
      
      // Start a timeout to force reset the call state if we don't receive a completion callback
      setTimeout(() => {
        if (isCallInProgress) {
          addLogEntry("Force resetting call state after timeout");
          setIsCallInProgress(false);
          setIsDisconnecting(false);
          setCallStatus("Idle");
          setCurrentCallSid(null);
        }
      }, 10000); // 10 second timeout
    } catch (err) {
      console.error("[PhoneNumberChecklist] Error during call disconnection:", err);
      addLogEntry(`Error during call disconnection: ${err}`);
      setError(err instanceof Error ? err.message : "Failed to disconnect call");
      setIsDisconnecting(false);
    }
  };

  // Get the appropriate color for the current call status
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "error":
      case "failed":
      case "busy":
      case "no-answer":
        return "text-red-600";
      case "completed":
        return "text-green-600";
      default:
        return "text-blue-600";
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <Card className="flex items-center justify-between p-4 relative">
        <div className="flex flex-col gap-2">
          <span className="text-sm text-gray-500">Number</span>
          <div className="flex items-center">
            <span className="font-medium w-36">
              {isVisible ? selectedPhoneNumber || "None" : "••••••••••"}
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsVisible(!isVisible)}
              className="h-8 w-8"
            >
              {isVisible ? (
                <Eye className="h-4 w-4" />
              ) : (
                <EyeOff className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            {allConfigsReady ? (
              <CheckCircle className="text-green-500 w-4 h-4" />
            ) : (
              <Circle className="text-gray-400 w-4 h-4" />
            )}
            <span className="text-sm text-gray-700">
              {allConfigsReady ? "Setup Ready" : "Setup Not Ready"}
            </span>
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <Input
                type="tel"
                placeholder="Enter phone number"
                value={toNumber}
                onChange={(e) => setToNumber(e.target.value)}
                className="w-48"
                disabled={!allConfigsReady || isCallInProgress}
              />
              {isCallInProgress ? (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={disconnectCall}
                  disabled={!currentCallSid || isDisconnecting}
                  className="flex items-center gap-2 min-w-[100px]"
                >
                  <PhoneOff className="h-4 w-4" />
                  {isDisconnecting ? "Ending..." : "End Call"}
                </Button>
              ) : (
                <Button
                  variant="default"
                  size="sm"
                  onClick={makeCall}
                  disabled={!allConfigsReady || !toNumber}
                  className="flex items-center gap-2"
                >
                  <Phone className="h-4 w-4" />
                  Call
                </Button>
              )}
            </div>
            {callStatus !== "Idle" && (
              <div className={`text-sm ${getStatusColor(callStatus)}`}>
                Status: {callStatus}
              </div>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAllConfigsReady(false)}
          >
            Checklist
          </Button>
        </div>
        {error && (
          <div className="absolute top-full left-0 right-0 mt-2 px-4">
            <p className="text-sm text-red-500">{error}</p>
          </div>
        )}
      </Card>
      
      {/* Call Log Panel */}
      <Card className="p-4">
        <h3 className="text-sm font-medium mb-2">Call Log</h3>
        <div className="max-h-40 overflow-y-auto text-xs font-mono">
          {callLog.map((log, index) => (
            <div key={index} className="py-1 border-b border-gray-100 last:border-0">
              {log}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

export default PhoneNumberChecklist;
