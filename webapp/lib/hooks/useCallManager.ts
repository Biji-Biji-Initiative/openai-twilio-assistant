import { useState, useEffect } from 'react';
import { logger } from '../logger';

export type CallStatus = 'idle' | 'dialing' | 'initiating' | 'ringing' | 'in-progress' | 'completed' | 'failed' | 'busy' | 'no-answer' | 'disconnecting' | 'error';

interface CallState {
  isCallInProgress: boolean;
  isDisconnecting: boolean;
  error: string;
  callStatus: CallStatus;
  currentCallSid: string | null;
  callLog: string[];
}

export function useCallManager() {
  const [state, setState] = useState<CallState>({
    isCallInProgress: false,
    isDisconnecting: false,
    error: '',
    callStatus: 'idle',
    currentCallSid: null,
    callLog: [],
  });

  const addLogEntry = (entry: string, details?: Record<string, any>) => {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${entry}${
      details ? `\n  ${JSON.stringify(details, null, 2)}` : ""
    }`;
    setState(prev => ({ ...prev, callLog: [...prev.callLog, logEntry] }));
    logger.info(logEntry);
  };

  useEffect(() => {
    const wsUrl = new URL("/logs", process.env.NEXT_PUBLIC_BACKEND_URL || "");
    wsUrl.protocol = wsUrl.protocol.replace("http", "ws");
    const ws = new WebSocket(wsUrl.toString());

    ws.onopen = () => {
      addLogEntry("WebSocket connection established");
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);

        if (msg.type === "call.status" && msg.callSid === state.currentCallSid) {
          const details = {
            status: msg.callStatus,
            duration: msg.duration,
            sequence: msg.sequence,
            direction: msg.direction,
            source: msg.source,
            timestamp: msg.eventTimestamp,
          };
          
          addLogEntry(`Call status update: ${msg.callStatus}`, details);
          
          setState(prev => {
            const newState = { ...prev, callStatus: msg.callStatus as CallStatus };
            
            if (msg.callStatus === "initiated") {
              newState.isCallInProgress = true;
              newState.isDisconnecting = false;
            } else if (["completed", "failed", "busy", "no-answer"].includes(msg.callStatus)) {
              newState.isCallInProgress = false;
              newState.isDisconnecting = false;
              if (msg.errorCode) {
                addLogEntry(`Error: ${msg.errorCode} - ${msg.errorMessage}`);
              }
              // Reset after a delay
              setTimeout(() => {
                setState(s => ({
                  ...s,
                  callStatus: 'idle',
                  currentCallSid: null
                }));
              }, 5000);
            } else if (["ringing", "in-progress"].includes(msg.callStatus)) {
              newState.isDisconnecting = false;
            }
            
            return newState;
          });
        }
      } catch (e) {
        logger.error("[CallManager] Error parsing WS message:", e);
        addLogEntry(`Error parsing WebSocket message: ${e}`);
      }
    };

    ws.onerror = (e) => {
      logger.error("[CallManager] WebSocket error:", e);
      addLogEntry(`WebSocket error: ${e}`);
    };

    ws.onclose = () => {
      addLogEntry("WebSocket connection closed");
    };

    return () => {
      ws.close();
    };
  }, [state.currentCallSid]);

  const makeCall = async (toNumber: string) => {
    if (!toNumber) {
      setState(prev => ({ ...prev, error: "Please enter a phone number to call" }));
      return;
    }

    addLogEntry(`Initiating outbound call to: ${toNumber}`);
    setState(prev => ({
      ...prev,
      isCallInProgress: true,
      callStatus: 'dialing',
      error: ''
    }));

    try {
      const response = await fetch("/api/outbound-call-proxy", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ to: toNumber }),
      });

      const data = await response.json();
      addLogEntry(`Response from outbound call endpoint: ${JSON.stringify(data)}`);
      
      if (!response.ok) {
        throw new Error(data.error || "Failed to make call");
      }

      addLogEntry(`Call initiated successfully. SID: ${data.sid}`);
      setState(prev => ({
        ...prev,
        callStatus: 'initiating',
        currentCallSid: data.sid
      }));
    } catch (err) {
      logger.error("[CallManager] Error during call initiation:", err);
      addLogEntry(`Error during call initiation: ${err}`);
      setState(prev => ({
        ...prev,
        error: err instanceof Error ? err.message : "Failed to make call",
        callStatus: 'error',
        isCallInProgress: false,
        currentCallSid: null
      }));
    }
  };

  const disconnectCall = async () => {
    if (!state.currentCallSid || state.isDisconnecting) return;

    setState(prev => ({ ...prev, isDisconnecting: true }));
    addLogEntry(`Disconnecting call: ${state.currentCallSid}`);
    
    try {
      const response = await fetch("/api/outbound-call-proxy", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "disconnect",
          callSid: state.currentCallSid,
        }),
      });

      const data = await response.json();
      addLogEntry(`Response from disconnect endpoint: ${JSON.stringify(data)}`);
      
      if (!response.ok) {
        throw new Error(data.error || "Failed to disconnect call");
      }

      addLogEntry("Call disconnect request sent successfully");
      setState(prev => ({ ...prev, callStatus: 'disconnecting' }));
      
      // Start a timeout to force reset the call state if we don't receive a completion callback
      setTimeout(() => {
        setState(prev => {
          if (prev.isCallInProgress) {
            addLogEntry("Force resetting call state after timeout");
            return {
              ...prev,
              isCallInProgress: false,
              isDisconnecting: false,
              callStatus: 'idle',
              currentCallSid: null
            };
          }
          return prev;
        });
      }, 10000);
    } catch (err) {
      logger.error("[CallManager] Error during call disconnection:", err);
      addLogEntry(`Error during call disconnection: ${err}`);
      setState(prev => ({
        ...prev,
        error: err instanceof Error ? err.message : "Failed to disconnect call",
        isDisconnecting: false
      }));
    }
  };

  return {
    ...state,
    makeCall,
    disconnectCall,
    addLogEntry
  };
} 