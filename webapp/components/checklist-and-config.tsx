"use client";

import React, { useEffect, useState, useMemo, useReducer } from "react";
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
};

type ChecklistItem = {
  label: string;
  done: boolean;
  description: string;
  field: React.ReactNode | null;
  loading?: boolean;
  error?: string;
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
};

function checklistReducer(state: ChecklistState, action: ChecklistAction): ChecklistState {
  switch (action.type) {
    case 'SET_CREDENTIALS':
      return { ...state, hasCredentials: action.payload };
    case 'SET_PHONE_NUMBERS':
      return { ...state, phoneNumbers: action.payload };
    case 'SET_CURRENT_NUMBER':
      return {
        ...state,
        currentNumberSid: action.payload.sid,
        currentVoiceUrl: action.payload.voiceUrl,
      };
    case 'SET_PUBLIC_URL':
      return { ...state, publicUrl: action.payload };
    case 'SET_LOCAL_SERVER':
      return { ...state, localServerUp: action.payload };
    case 'SET_PUBLIC_URL_ACCESSIBLE':
      return { ...state, publicUrlAccessible: action.payload };
    case 'SET_WEBHOOK_LOADING':
      return { ...state, webhookLoading: action.payload };
    case 'SET_NGROK_LOADING':
      return { ...state, ngrokLoading: action.payload };
    case 'SET_POLLING':
      return { ...state, isPolling: action.payload };
    case 'UPDATE_ALL_CHECKS':
      const webhookUrl = state.publicUrl ? `${state.publicUrl}/twiml` : "";
      const allDone = [
        state.hasCredentials,
        state.phoneNumbers.length > 0,
        state.localServerUp,
        state.publicUrlAccessible,
        !!state.publicUrl && webhookUrl === state.currentVoiceUrl
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

  useEffect(() => {
    let mounted = true;
    let timeoutId: NodeJS.Timeout;

    const pollChecks = async () => {
      if (!mounted || ready) return;
      
      try {
        dispatch({ type: 'SET_POLLING', payload: true });
        
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
        if (!backendUrl) {
          console.warn("[Checklist] NEXT_PUBLIC_BACKEND_URL not set");
          return;
        }
        
        // 1. Check credentials
        let res = await fetch(`${backendUrl}/api/twilio`, {
          method: 'GET',
          headers: {
            'Cache-Control': 'no-cache',
            'Accept': 'application/json'
          }
        });
        
        if (!mounted) return;
        
        if (!res.ok) {
          const errorText = await res.text();
          console.warn("[Checklist] Credentials check failed:", errorText);
          dispatch({ type: 'SET_CREDENTIALS', payload: false });
          return;
        }

        let credData;
        try {
          credData = await res.json();
          if (mounted) {
            dispatch({ type: 'SET_CREDENTIALS', payload: !!credData?.credentialsSet });
          }
        } catch (err) {
          console.warn("[Checklist] Failed to parse credentials response:", err);
          if (mounted) {
            dispatch({ type: 'SET_CREDENTIALS', payload: false });
          }
          return;
        }

        // 2. Fetch numbers
        res = await fetch(`${backendUrl}/api/twilio/numbers`, {
          method: 'GET',
          headers: {
            'Cache-Control': 'no-cache',
            'Accept': 'application/json'
          }
        });
        
        if (!res.ok) {
          const errorText = await res.text();
          console.warn("[Checklist] Failed to fetch phone numbers:", errorText);
          return;
        }

        let numbersData;
        try {
          numbersData = await res.json();
          // The response is already the array of numbers
          if (!Array.isArray(numbersData)) {
            console.warn("[Checklist] Invalid phone numbers response format");
            return;
          }
        } catch (err) {
          console.warn("[Checklist] Failed to parse phone numbers response:", err);
          return;
        }

        if (mounted && numbersData.length > 0) {
          dispatch({ type: 'SET_PHONE_NUMBERS', payload: numbersData });
          // If currentNumberSid not set or not in the list, use first
          const selected =
            numbersData.find((p: PhoneNumber) => p.sid === state.currentNumberSid) ||
            numbersData[0];
          
          if (!selected?.sid) {
            console.warn("[Checklist] Invalid phone number data");
            return;
          }

          dispatch({ type: 'SET_CURRENT_NUMBER', payload: { 
            sid: selected.sid, 
            voiceUrl: selected.voiceUrl || "", 
            friendlyName: selected.friendlyName || "" 
          }});
          setSelectedPhoneNumber(selected.friendlyName || "");
        }

        // 3. Check local server & public URL
        try {
          // First check if the local server is up using the backend URL
          const localHealthRes = await fetch(`${backendUrl}/api/health`, {
            method: 'GET',
            headers: {
              'Cache-Control': 'no-cache',
              'Accept': 'application/json'
            }
          });
          
          if (localHealthRes.ok) {
            const healthData = await localHealthRes.json();
            if (mounted) {
              dispatch({ type: 'SET_LOCAL_SERVER', payload: true });
            }
            
            // Get public URL from the health check response
            if (healthData?.environment?.publicUrl) {
              const foundPublicUrl = healthData.environment.publicUrl;
              if (mounted) {
                dispatch({ type: 'SET_PUBLIC_URL', payload: foundPublicUrl });
                
                // If we have a public URL, check ngrok immediately
                if (!state.publicUrlAccessible && !state.ngrokLoading) {
                  await checkNgrok();
                }
              }
              console.log("[Checklist] Server health check successful:", {
                publicUrl: foundPublicUrl,
                status: healthData.status,
                service: healthData.service,
                environment: healthData.environment
              });
            } else {
              console.warn("[Checklist] Health check response missing publicUrl:", healthData);
              if (mounted) {
                dispatch({ type: 'SET_LOCAL_SERVER', payload: false });
              }
            }
          } else {
            const errorText = await localHealthRes.text();
            console.warn("[Checklist] Health check failed:", {
              status: localHealthRes.status,
              error: errorText
            });
            if (mounted) {
              dispatch({ type: 'SET_LOCAL_SERVER', payload: false });
            }
          }
        } catch (err) {
          console.warn("[Checklist] Error checking local server:", err);
          if (mounted) {
            dispatch({ type: 'SET_LOCAL_SERVER', payload: false });
          }
        }

        // After all checks are complete, update allChecksPassed
        if (mounted) {
          dispatch({ type: 'UPDATE_ALL_CHECKS' });
        }
      } catch (err) {
        console.warn("[Checklist] Error in pollChecks:", err);
      } finally {
        if (mounted) {
          dispatch({ type: 'SET_POLLING', payload: false });
          if (!ready) {
            timeoutId = setTimeout(pollChecks, 3000);
          }
        }
      }
    };

    pollChecks();
    
    return () => {
      mounted = false;
      clearTimeout(timeoutId);
      dispatch({ type: 'SET_POLLING', payload: false });
    };
  }, [ready, state.localServerUp, state.publicUrl, state.publicUrlAccessible, state.ngrokLoading, state.currentNumberSid]);

  const updateWebhook = async () => {
    if (!state.currentNumberSid || !appendedTwimlUrl) return;
    
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
    if (!backendUrl) {
      console.warn("[Checklist] NEXT_PUBLIC_BACKEND_URL not set");
      return;
    }

    dispatch({ type: 'SET_WEBHOOK_LOADING', payload: true });
    try {
      const res = await fetch(`${backendUrl}/api/twilio/numbers`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          'Cache-Control': 'no-cache'
        },
        body: JSON.stringify({
          phoneNumberSid: state.currentNumberSid,
          voiceUrl: appendedTwimlUrl,
        }),
      });
      
      if (!res.ok) {
        const errorText = await res.text();
        console.warn("[Checklist] Failed to update webhook:", errorText);
        throw new Error("Failed to update webhook");
      }
      
      const updatedNumber = await res.json();
      dispatch({ type: 'SET_CURRENT_NUMBER', payload: { 
        sid: updatedNumber.sid,
        voiceUrl: updatedNumber.voiceUrl || "",
        friendlyName: updatedNumber.friendlyName || ""
      }});
    } catch (err) {
      console.error("[Checklist] Error updating webhook:", err);
    } finally {
      dispatch({ type: 'SET_WEBHOOK_LOADING', payload: false });
    }
  };

  const checkNgrok = async () => {
    if (!state.localServerUp || !state.publicUrl || state.ngrokLoading) return;
    dispatch({ type: 'SET_NGROK_LOADING', payload: true });
    let success = false;
    
    for (let i = 0; i < 5; i++) {
      if (!state.localServerUp || !state.publicUrl) break;
      
      try {
        const resTest = await fetch(`${state.publicUrl}/api/health`, {
          method: 'GET',
          headers: {
            'Cache-Control': 'no-cache',
            'Accept': 'application/json'
          }
        });
        
        if (resTest.ok) {
          const healthData = await resTest.json();
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
          }
        } else {
          const errorText = await resTest.text();
          console.warn("[Checklist] Ngrok health check failed:", {
            status: resTest.status,
            statusText: resTest.statusText,
            error: errorText
          });
        }
      } catch (err) {
        console.warn("[Checklist] Ngrok health check error:", err);
      }
      
      if (i < 4) {
        console.log(`[Checklist] Retrying ngrok check (attempt ${i + 2}/5)...`);
        await new Promise((r) => setTimeout(r, 3000));
      }
    }
    
    if (!success) {
      console.warn("[Checklist] All ngrok health check attempts failed");
      dispatch({ type: 'SET_PUBLIC_URL_ACCESSIBLE', payload: false });
    }
    
    dispatch({ type: 'SET_NGROK_LOADING', payload: false });
  };

  const checklist = useMemo(() => {
    return [
      {
        label: "Set up Twilio account",
        done: state.hasCredentials,
        description: "Then update account details in webapp/.env",
        loading: false,
        error: undefined,
        field: (
          <Button
            className="w-full"
            onClick={() => window.open("https://console.twilio.com/", "_blank")}
          >
            Open Twilio Console
          </Button>
        ),
      } as ChecklistItem,
      {
        label: "Set up Twilio phone number",
        done: state.phoneNumbers.length > 0,
        description: "Costs around $1.15/month",
        loading: false,
        error: undefined,
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
      } as ChecklistItem,
      {
        label: "Start local WebSocket server",
        done: state.localServerUp,
        description: "cd websocket-server && npm run dev",
        loading: false,
        error: undefined,
        field: null,
      } as ChecklistItem,
      {
        label: "Start ngrok",
        done: state.publicUrlAccessible,
        description: "Then set ngrok URL in websocket-server/.env",
        loading: state.ngrokLoading,
        error: undefined,
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
      } as ChecklistItem,
      {
        label: "Update Twilio webhook URL",
        done: !!state.publicUrl && !isWebhookMismatch,
        description: "Can also be done manually in Twilio console",
        loading: state.webhookLoading,
        error: undefined,
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
      } as ChecklistItem,
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
      <DialogContent className="w-full max-w-[800px] overflow-y-auto max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Setup Checklist</DialogTitle>
          <DialogDescription>
            This sample app requires a few steps before you get started
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 space-y-4">
          {checklist.map((item, i) => (
            <div
              key={i}
              className="flex flex-col sm:flex-row items-start sm:items-center gap-4 py-3 border-b last:border-b-0"
            >
              <div className="flex items-start gap-4 flex-1 min-w-0">
                <div className="flex-none pt-1">
                  {item.loading ? (
                    <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                  ) : item.done ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <Circle className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium leading-none mb-1">
                    {item.label}
                  </div>
                  <div className="text-sm text-muted-foreground break-words">
                    {item.error ? (
                      <span className="text-red-500">{item.error}</span>
                    ) : (
                      item.description
                    )}
                  </div>
                </div>
              </div>
              {item.field && (
                <div className="w-full sm:w-auto flex-none sm:min-w-[200px]">
                  {item.field}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-6 flex flex-col sm:flex-row sm:justify-between items-center gap-4">
          <div className="text-sm text-muted-foreground">
            {state.allChecksPassed ? (
              <span className="text-green-500">✓ All checks passed</span>
            ) : (
              <span>Complete all steps to continue</span>
            )}
          </div>
          <Button
            variant="default"
            onClick={handleDone}
            disabled={!state.allChecksPassed}
            className="w-full sm:w-auto"
          >
            {state.allChecksPassed ? "Let's go!" : "Complete all steps"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
