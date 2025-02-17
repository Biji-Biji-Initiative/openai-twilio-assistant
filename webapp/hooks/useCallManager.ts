import { useState, useCallback } from 'react';
import { logger } from '@/lib/logger';

export type CallStatus = 'idle' | 'dialing' | 'initiating' | 'ringing' | 'in-progress' | 'completed' | 'failed' | 'busy' | 'no-answer' | 'disconnecting' | 'error';

export interface UseCallManagerReturn {
  isCallInProgress: boolean;
  isDisconnecting: boolean;
  error: string | null;
  callStatus: CallStatus;
  callLog: string[];
  makeCall: (phoneNumber: string) => Promise<void>;
  disconnectCall: () => Promise<void>;
}

export function useCallManager(): UseCallManagerReturn {
  const [isCallInProgress, setIsCallInProgress] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [callStatus, setCallStatus] = useState<CallStatus>('idle');
  const [callLog, setCallLog] = useState<string[]>([]);

  const addLogEntry = useCallback((entry: string, details?: Record<string, any>) => {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${entry}${
      details ? `\n  ${JSON.stringify(details, null, 2)}` : ""
    }`;
    setCallLog(prev => [...prev, logEntry]);
    logger.info(logEntry);
  }, []);

  const makeCall = useCallback(async (phoneNumber: string) => {
    if (!phoneNumber) {
      setError("Please enter a phone number to call");
      return;
    }

    addLogEntry(`Initiating outbound call to: ${phoneNumber}`);
    setIsCallInProgress(true);
    setCallStatus('dialing');
    setError(null);

    try {
      const response = await fetch("/api/outbound-call-proxy", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ phoneNumber }),
      });

      const data = await response.json();
      addLogEntry(`Response from outbound call endpoint: ${JSON.stringify(data)}`);
      
      if (!response.ok) {
        throw new Error(data.error || "Failed to make call");
      }

      addLogEntry(`Call initiated successfully. SID: ${data.callSid}`);
      setCallStatus('initiating');
    } catch (err) {
      logger.error("[CallManager] Error during call initiation:", err);
      addLogEntry(`Error during call initiation: ${err}`);
      setError(err instanceof Error ? err.message : "Failed to make call");
      setCallStatus('error');
      setIsCallInProgress(false);
    }
  }, [addLogEntry]);

  const disconnectCall = useCallback(async () => {
    if (isDisconnecting) return;

    setIsDisconnecting(true);
    addLogEntry("Disconnecting call");
    
    try {
      const response = await fetch("/api/outbound-call-proxy", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "disconnect"
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
      }, 10000);
    } catch (err) {
      logger.error("[CallManager] Error during call disconnection:", err);
      addLogEntry(`Error during call disconnection: ${err}`);
      setError(err instanceof Error ? err.message : "Failed to disconnect call");
      setIsDisconnecting(false);
    }
  }, [isDisconnecting, addLogEntry]);

  return {
    isCallInProgress,
    isDisconnecting,
    error,
    callStatus,
    callLog,
    makeCall,
    disconnectCall
  };
} 