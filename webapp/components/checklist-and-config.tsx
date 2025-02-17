"use client";

import React, { useEffect, useState, useMemo, useReducer, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Circle, CheckCircle, Loader2 } from "lucide-react";
import { PhoneNumber } from "@/components/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Helper functions for API calls
const fetchJSON = async (url: string, options: RequestInit = {}) => {
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
      'Accept': 'application/json',
      ...options.headers,
    },
    credentials: 'include',
    mode: 'cors',
    ...options,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Request failed: ${response.status} - ${errorText}`);
  }

  return response.json();
};

type ChecklistState = {
  hasCredentials: boolean;
  phoneNumbers: PhoneNumber[];
  currentNumberSid: string;
  currentVoiceUrl: string;
  publicUrl: string;
  localServerUp: boolean;
  publicUrlAccessible: boolean;
  allChecksPassed: boolean;
  webhookLoading: boolean;
  ngrokLoading: boolean;
  isPolling: boolean;
  error: string | null; // Added error state
  lastCheckTime: number | null; // Added to track last check time
};

type ChecklistAction = 
  | { type: 'SET_CREDENTIALS', payload: boolean }
  | { type: 'SET_PHONE_NUMBERS', payload: PhoneNumber[] }
  | { type: 'SET_CURRENT_NUMBER', payload: { sid: string; voiceUrl: string; friendlyName: string } }
  | { type: 'SET_PUBLIC_URL', payload: string }
  | { type: 'SET_LOCAL_SERVER', payload: boolean }
  | { type: 'SET_PUBLIC_URL_ACCESSIBLE', payload: boolean }
  | { type: 'SET_WEBHOOK_LOADING', payload: boolean }
  | { type: 'SET_NGROK_LOADING', payload: boolean }
  | { type: 'SET_POLLING', payload: boolean }
  | { type: 'SET_ERROR', payload: string | null }
  | { type: 'UPDATE_LAST_CHECK_TIME' }
  | { type: 'UPDATE_ALL_CHECKS' };

const initialState: ChecklistState = {
  hasCredentials: false,
  phoneNumbers: [],
  currentNumberSid: "",
  currentVoiceUrl: "",
  publicUrl: "",
  localServerUp: false,
  publicUrlAccessible: false,
  allChecksPassed: false,
  webhookLoading: false,
  ngrokLoading: false,
  isPolling: false,
  error: null,
  lastCheckTime: null,
};

function checklistReducer(state: ChecklistState, action: ChecklistAction): ChecklistState {
  switch (action.type) {
    case 'SET_CREDENTIALS':
      return { ...state, hasCredentials: action.payload, error: null };
    case 'SET_PHONE_NUMBERS':
      return { ...state, phoneNumbers: action.payload, error: null };
    case 'SET_CURRENT_NUMBER':
      return {
        ...state,
        currentNumberSid: action.payload.sid,
        currentVoiceUrl: action.payload.voiceUrl,
        error: null,
      };
    case 'SET_PUBLIC_URL':
      return { ...state, publicUrl: action.payload, error: null };
    case 'SET_LOCAL_SERVER':
      return { ...state, localServerUp: action.payload, error: null };
    case 'SET_PUBLIC_URL_ACCESSIBLE':
      return { ...state, publicUrlAccessible: action.payload, error: null };
    case 'SET_WEBHOOK_LOADING':
      return { ...state, webhookLoading: action.payload };
    case 'SET_NGROK_LOADING':
      return { ...state, ngrokLoading: action.payload };
    case 'SET_POLLING':
      return { ...state, isPolling: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'UPDATE_LAST_CHECK_TIME':
      return { ...state, lastCheckTime: Date.now() };
    case 'UPDATE_ALL_CHECKS':
      // Simplified webhook check logic
      const webhookUpdated = state.publicUrl ? 
        `${state.publicUrl}/twiml` === state.currentVoiceUrl : 
        false;
      
      const allDone = [
        state.hasCredentials,
        state.phoneNumbers.length > 0,
        state.localServerUp,
        state.publicUrlAccessible,
        webhookUpdated
      ].every(Boolean);
      
      return { ...state, allChecksPassed: allDone };
    default:
      return state;
  }
}

export default function ChecklistAndConfig({
  ready,
  setReady,
  selectedPhoneNumber,
  setSelectedPhoneNumber,
}: {
  ready: boolean;
  setReady: (val: boolean) => void;
  selectedPhoneNumber: string;
  setSelectedPhoneNumber: (val: string) => void;
}) {
  const [state, dispatch] = useReducer(checklistReducer, initialState);
  
  const appendedTwimlUrl = state.publicUrl ? `${state.publicUrl}/twiml` : "";
  const isWebhookMismatch =
    appendedTwimlUrl && state.currentVoiceUrl && appendedTwimlUrl !== state.currentVoiceUrl;

  // Memoized function for checking ngrok
  const checkNgrok = useCallback(async () => {
    if (!state.localServerUp || !state.publicUrl || state.ngrokLoading) return;
    
    dispatch({ type: 'SET_NGROK_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });
    
    let success = false;
    
    for (let i = 0; i < 5; i++) {
      if (!state.localServerUp || !state.publicUrl) break;
      
      try {
        const healthData = await fetchJSON(`${state.publicUrl}/health`);
        
        if (healthData?.status === 'ok' && healthData?.environment?.publicUrl) {
          console.log("[Checklist] Ngrok health check successful:", {
            publicUrl: healthData.environment.publicUrl,
            status: healthData.status,
            service: healthData.service
          });
          dispatch({ type: 'SET_PUBLIC_URL_ACCESSIBLE', payload: true });
          success = true;
          break;
        } else {
          console.warn("[Checklist] Ngrok health check response invalid:", healthData);
          dispatch({ type: 'SET_ERROR', payload: 'Invalid ngrok health check response' });
        }
      } catch (err) {
        console.warn("[Checklist] Ngrok health check error:", err);
        dispatch({ type: 'SET_ERROR', payload: err instanceof Error ? err.message : 'Failed to check ngrok' });
      }
      
      if (i < 4) {
        console.log(`[Checklist] Retrying ngrok check (attempt ${i + 2}/5)...`);
        await new Promise((r) => setTimeout(r, 3000));
      }
    }
    
    if (!success) {
      console.warn("[Checklist] All ngrok health check attempts failed");
      dispatch({ type: 'SET_PUBLIC_URL_ACCESSIBLE', payload: false });
      dispatch({ type: 'SET_ERROR', payload: 'Failed to verify ngrok tunnel' });
    }
    
    dispatch({ type: 'SET_NGROK_LOADING', payload: false });
  }, [state.localServerUp, state.publicUrl, state.ngrokLoading]);

  // Polling effect with proper dependencies
  useEffect(() => {
    let mounted = true;
    let timeoutId: NodeJS.Timeout;

    const pollChecks = async () => {
      if (!mounted || state.isPolling || ready) return;
      
      try {
        dispatch({ type: 'SET_POLLING', payload: true });
        dispatch({ type: 'SET_ERROR', payload: null });
        
        // 1. Check credentials
        try {
          const credData = await fetchJSON("/api/twilio");
          if (mounted) {
            dispatch({ type: 'SET_CREDENTIALS', payload: !!credData?.credentialsSet });
          }
        } catch (err) {
          console.warn("[Checklist] Credentials check failed:", err);
          if (mounted) {
            dispatch({ type: 'SET_CREDENTIALS', payload: false });
            dispatch({ type: 'SET_ERROR', payload: 'Failed to verify Twilio credentials' });
          }
          return;
        }

        // 2. Fetch numbers
        try {
          const numbersData = await fetchJSON("/api/twilio/numbers");
          
          if (!Array.isArray(numbersData)) {
            throw new Error("Invalid phone numbers response format");
          }

          if (mounted && numbersData.length > 0) {
            dispatch({ type: 'SET_PHONE_NUMBERS', payload: numbersData });
            
            const selected =
              numbersData.find((p: PhoneNumber) => p.sid === state.currentNumberSid) ||
              numbersData[0];
            
            if (!selected?.sid) {
              throw new Error("Invalid phone number data");
            }

            dispatch({ type: 'SET_CURRENT_NUMBER', payload: { 
              sid: selected.sid, 
              voiceUrl: selected.voiceUrl || "", 
              friendlyName: selected.friendlyName || "" 
            }});
            setSelectedPhoneNumber(selected.friendlyName || "");
          }
        } catch (err) {
          console.warn("[Checklist] Failed to fetch phone numbers:", err);
          if (mounted) {
            dispatch({ type: 'SET_ERROR', payload: 'Failed to fetch Twilio phone numbers' });
          }
          return;
        }

        // 3. Check local server & public URL
        try {
          const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
          if (!backendUrl) {
            throw new Error("NEXT_PUBLIC_BACKEND_URL not set");
          }

          try {
            const healthData = await fetchJSON(`${backendUrl}/health`);
            
            if (mounted) {
              dispatch({ type: 'SET_LOCAL_SERVER', payload: true });
              
              if (healthData?.environment?.publicUrl) {
                dispatch({ type: 'SET_PUBLIC_URL', payload: healthData.environment.publicUrl });
                console.log("[Checklist] Server health check successful:", {
                  publicUrl: healthData.environment.publicUrl,
                  status: healthData.status,
                  service: healthData.service,
                  environment: healthData.environment
                });
              } else if (healthData?.environment?.mode === 'development') {
                dispatch({ type: 'SET_PUBLIC_URL', payload: 'http://localhost:8081' });
                console.log("[Checklist] Using default development URL");
              }
            }
          } catch (healthErr) {
            console.warn("[Checklist] Health check failed:", healthErr);
            
            // Fallback to public-url endpoint
            try {
              const pubData = await fetchJSON(`${backendUrl}/public-url`);
              const foundPublicUrl = pubData?.publicUrl || "";
              
              if (foundPublicUrl && mounted) {
                dispatch({ type: 'SET_LOCAL_SERVER', payload: true });
                dispatch({ type: 'SET_PUBLIC_URL', payload: foundPublicUrl });
                console.log("[Checklist] Public URL check successful:", foundPublicUrl);
              } else {
                throw new Error("No public URL found in response");
              }
            } catch (pubErr) {
              throw new Error(`Failed to get public URL: ${pubErr instanceof Error ? pubErr.message : 'Unknown error'}`);
            }
          }
        } catch (err) {
          console.warn("[Checklist] Error checking local server:", err);
          if (mounted) {
            dispatch({ type: 'SET_LOCAL_SERVER', payload: false });
            dispatch({ type: 'SET_PUBLIC_URL', payload: "" });
            dispatch({ type: 'SET_ERROR', payload: err instanceof Error ? err.message : 'Failed to check local server' });
          }
        }

        if (mounted) {
          dispatch({ type: 'UPDATE_ALL_CHECKS' });
          dispatch({ type: 'UPDATE_LAST_CHECK_TIME' });
          
          // Trigger ngrok check if needed
          if (state.localServerUp && state.publicUrl && !state.publicUrlAccessible && !state.ngrokLoading) {
            await checkNgrok();
          }
        }
      } catch (err) {
        console.warn("[Checklist] Error in pollChecks:", err);
        if (mounted) {
          dispatch({ type: 'SET_ERROR', payload: 'Failed to complete checklist verification' });
        }
      } finally {
        if (mounted && !ready) {
          dispatch({ type: 'SET_POLLING', payload: false });
          timeoutId = setTimeout(pollChecks, 2000);
        }
      }
    };

    if (!ready) {
      pollChecks();
    }
    
    return () => {
      mounted = false;
      clearTimeout(timeoutId);
      dispatch({ type: 'SET_POLLING', payload: false });
    };
  }, [ready, setSelectedPhoneNumber, checkNgrok]);

  // Separate effect for handling ngrok checks
  useEffect(() => {
    if (state.localServerUp && state.publicUrl && !state.publicUrlAccessible && !state.ngrokLoading && !ready) {
      checkNgrok();
    }
  }, [state.localServerUp, state.publicUrl, state.publicUrlAccessible, state.ngrokLoading, ready, checkNgrok]);

  const updateWebhook = async () => {
    if (!state.currentNumberSid || !appendedTwimlUrl) return;
    dispatch({ type: 'SET_WEBHOOK_LOADING', payload: true });
    try {
      const res = await fetch("/api/twilio/numbers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phoneNumberSid: state.currentNumberSid,
          voiceUrl: appendedTwimlUrl,
        }),
      });
      if (!res.ok) throw new Error("Failed to update webhook");
      dispatch({ type: 'SET_CURRENT_NUMBER', payload: { sid: state.currentNumberSid, voiceUrl: appendedTwimlUrl, friendlyName: "" } });
    } catch (err) {
      console.error(err);
    } finally {
      dispatch({ type: 'SET_WEBHOOK_LOADING', payload: false });
    }
  };

  const checklist = useMemo(() => {
    return [
      {
        label: "Set up Twilio account",
        done: state.hasCredentials,
        description: "Then update account details in webapp/.env",
        field: (
          <Button
            className="w-full"
            onClick={() => window.open("https://console.twilio.com/", "_blank")}
          >
            Open Twilio Console
          </Button>
        ),
      },
      {
        label: "Set up Twilio phone number",
        done: state.phoneNumbers.length > 0,
        description: "Costs around $1.15/month",
        field:
          state.phoneNumbers.length > 0 ? (
            state.phoneNumbers.length === 1 ? (
              <Input value={state.phoneNumbers[0].friendlyName || ""} disabled />
            ) : (
              <Select
                onValueChange={(value) => {
                  const selected = state.phoneNumbers.find((p) => p.sid === value);
                  if (selected) {
                    dispatch({
                      type: 'SET_CURRENT_NUMBER',
                      payload: {
                        sid: value,
                        voiceUrl: selected.voiceUrl || "",
                        friendlyName: selected.friendlyName || ""
                      }
                    });
                    setSelectedPhoneNumber(selected.friendlyName || "");
                  }
                }}
                value={state.currentNumberSid}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a phone number" />
                </SelectTrigger>
                <SelectContent>
                  {state.phoneNumbers.map((phone) => (
                    <SelectItem key={phone.sid} value={phone.sid}>
                      {phone.friendlyName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )
          ) : (
            <Button
              className="w-full"
              onClick={() =>
                window.open(
                  "https://console.twilio.com/us1/develop/phone-numbers/manage/incoming",
                  "_blank"
                )
              }
            >
              Set up Twilio phone number
            </Button>
          ),
      },
      {
        label: "Start local WebSocket server",
        done: state.localServerUp,
        description: "cd websocket-server && npm run dev",
        field: null,
      },
      {
        label: "Start ngrok",
        done: state.publicUrlAccessible,
        description: "Then set ngrok URL in websocket-server/.env",
        field: (
          <div className="flex items-center gap-2 w-full">
            <div className="flex-1">
              <Input value={state.publicUrl} disabled />
            </div>
            <div className="flex-1">
              <Button
                variant="outline"
                onClick={checkNgrok}
                disabled={state.ngrokLoading || !state.localServerUp || !state.publicUrl}
                className="w-full"
              >
                {state.ngrokLoading ? (
                  <Loader2 className="mr-2 h-4 animate-spin" />
                ) : (
                  "Check ngrok"
                )}
              </Button>
            </div>
          </div>
        ),
      },
      {
        label: "Update Twilio webhook URL",
        done: !!state.publicUrl && !isWebhookMismatch,
        description: "Can also be done manually in Twilio console",
        field: (
          <div className="flex items-center gap-2 w-full">
            <div className="flex-1">
              <Input value={state.currentVoiceUrl} disabled className="w-full" />
            </div>
            <div className="flex-1">
              <Button
                onClick={updateWebhook}
                disabled={state.webhookLoading}
                className="w-full"
              >
                {state.webhookLoading ? (
                  <Loader2 className="mr-2 h-4 animate-spin" />
                ) : (
                  "Update Webhook"
                )}
              </Button>
            </div>
          </div>
        ),
      },
    ];
  }, [
    state.hasCredentials,
    state.phoneNumbers,
    state.currentNumberSid,
    state.localServerUp,
    state.publicUrl,
    state.publicUrlAccessible,
    state.currentVoiceUrl,
    isWebhookMismatch,
    appendedTwimlUrl,
    state.webhookLoading,
    state.ngrokLoading,
    setSelectedPhoneNumber,
  ]);

  const handleDone = () => {
    if (state.allChecksPassed) {
      setReady(true);
    }
  };

  return (
    <Dialog open={!ready}>
      <DialogContent className="w-full max-w-[800px]">
        <DialogHeader>
          <DialogTitle>Setup Checklist</DialogTitle>
          <DialogDescription>
            This sample app requires a few steps before you get started
          </DialogDescription>
        </DialogHeader>

        {state.error && (
          <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-md">
            {state.error}
          </div>
        )}

        <div className="mt-4 space-y-0">
          {checklist.map((item, i) => (
            <div
              key={i}
              className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 py-2"
            >
              <div className="flex flex-col">
                <div className="flex items-center gap-2 mb-1">
                  {item.done ? (
                    <CheckCircle className="text-green-500" />
                  ) : (
                    <Circle className="text-gray-400" />
                  )}
                  <span className="font-medium">{item.label}</span>
                </div>
                {item.description && (
                  <p className="text-sm text-gray-500 ml-8">
                    {item.description}
                  </p>
                )}
              </div>
              <div className="flex items-center mt-2 sm:mt-0">{item.field}</div>
            </div>
          ))}
        </div>

        <div className="mt-6 flex flex-col sm:flex-row sm:justify-end">
          <Button
            variant="outline"
            onClick={handleDone}
            disabled={!state.allChecksPassed}
          >
            Let's go!
          </Button>
        </div>

        {state.lastCheckTime && (
          <div className="mt-2 text-xs text-gray-500 text-right">
            Last checked: {new Date(state.lastCheckTime).toLocaleTimeString()}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
