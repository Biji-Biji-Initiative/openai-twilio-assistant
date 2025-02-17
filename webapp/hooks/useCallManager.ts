import { useState, useCallback, useEffect } from 'react';
import { logger } from '@/lib/logger';
import { wsManager } from '@/lib/websocket-manager';

export type CallStatus = 'idle' | 'initiated' | 'ringing' | 'in-progress' | 'completed' | 'failed' | 'busy' | 'no-answer' | 'disconnecting';

interface UseCallManagerReturn {
  isCallInProgress: boolean;
  isDisconnecting: boolean;
  error: string | null;
  callStatus: CallStatus;
  callLog: string[];
  currentCallSid: string | null;
  makeCall: (phoneNumber: string) => Promise<void>;
  disconnectCall: () => Promise<void>;
}

export function useCallManager(): UseCallManagerReturn {
  const [isCallInProgress, setIsCallInProgress] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [callStatus, setCallStatus] = useState<CallStatus>('idle');
  const [callLog, setCallLog] = useState<string[]>([]);
  const [currentCallSid, setCurrentCallSid] = useState<string | null>(null);

  const addLogEntry = useCallback((entry: string, details?: Record<string, any>) => {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${entry}${
      details ? `\n  ${JSON.stringify(details, null, 2)}` : ""
    }`;
    setCallLog(prev => [...prev, logEntry]);
    logger.info(logEntry);
  }, []);

  useEffect(() => {
    wsManager.connect();

    const unsubscribe = wsManager.subscribe((msg) => {
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
        
        setCallStatus(msg.callStatus as CallStatus);
        
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
            setCallStatus('idle');
            setCurrentCallSid(null);
          }, 5000);
        } else if (["ringing", "in-progress"].includes(msg.callStatus)) {
          setIsDisconnecting(false);
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, [currentCallSid, addLogEntry]);

  const makeCall = useCallback(async (phoneNumber: string) => {
    try {
      const response = await fetch("/api/outbound-call-proxy", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "call",
          phoneNumber,
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Failed to initiate call");
      }

      setCurrentCallSid(data.callSid);
      addLogEntry(`Call initiated to ${phoneNumber}`, data);
      setCallStatus('initiated');
    } catch (err) {
      logger.error("[CallManager] Error initiating call:", err);
      addLogEntry(`Error initiating call: ${err}`);
      setError(err instanceof Error ? err.message : "Failed to initiate call");
    }
  }, [addLogEntry]);

  const disconnectCall = useCallback(async () => {
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
      setCallStatus('disconnecting');
      
      // Start a timeout to force reset the call state if we don't receive a completion callback
      setTimeout(() => {
        setIsCallInProgress(prev => {
          if (prev) {
            addLogEntry("Force resetting call state after timeout");
            return false;
          }
          return prev;
        });
        setIsDisconnecting(false);
        setCallStatus('idle');
        setCurrentCallSid(null);
      }, 10000);
    } catch (err) {
      logger.error("[CallManager] Error during call disconnection:", err);
      addLogEntry(`Error during call disconnection: ${err}`);
      setError(err instanceof Error ? err.message : "Failed to disconnect call");
      setIsDisconnecting(false);
    }
  }, [currentCallSid, isDisconnecting, addLogEntry]);

  return {
    isCallInProgress,
    isDisconnecting,
    error,
    callStatus,
    callLog,
    currentCallSid,
    makeCall,
    disconnectCall
  };
} 