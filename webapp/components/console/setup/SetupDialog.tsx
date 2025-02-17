"use client";

import React, { useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { SetupChecklist } from './SetupChecklist';
import { SetupProps } from '@/types/setup';
import { setupReducer, initialState } from '@/lib/reducers/setup-reducer';
import { logger } from '@/lib/logger';

export function SetupDialog({ ready, setReady, selectedPhoneNumber, setSelectedPhoneNumber }: SetupProps) {
  const [state, dispatch] = React.useReducer(setupReducer, initialState);

  useEffect(() => {
    let mounted = true;
    let timeoutId: NodeJS.Timeout;

    const pollChecks = async () => {
      if (!mounted || ready) return;
      
      try {
        dispatch({ type: 'SET_POLLING', payload: true });
        
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
        if (!backendUrl) {
          logger.warn("[Setup] NEXT_PUBLIC_BACKEND_URL not set");
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
          logger.warn("[Setup] Credentials check failed:", errorText);
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
          logger.warn("[Setup] Failed to parse credentials response:", err);
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
          logger.warn("[Setup] Failed to fetch phone numbers:", errorText);
          return;
        }

        let numbersData;
        try {
          numbersData = await res.json();
          if (!Array.isArray(numbersData)) {
            logger.warn("[Setup] Invalid phone numbers response format");
            return;
          }
        } catch (err) {
          logger.warn("[Setup] Failed to parse phone numbers response:", err);
          return;
        }

        if (mounted && numbersData.length > 0) {
          dispatch({ type: 'SET_PHONE_NUMBERS', payload: numbersData });
          const selected = numbersData.find(p => p.sid === state.currentNumberSid) || numbersData[0];
          
          if (!selected?.sid) {
            logger.warn("[Setup] Invalid phone number data");
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
            
            if (healthData?.environment?.publicUrl) {
              const foundPublicUrl = healthData.environment.publicUrl;
              if (mounted) {
                dispatch({ type: 'SET_PUBLIC_URL', payload: foundPublicUrl });
                
                if (!state.publicUrlAccessible && !state.ngrokLoading) {
                  await checkNgrok();
                }
              }
              logger.info("[Setup] Server health check successful:", {
                publicUrl: foundPublicUrl,
                status: healthData.status,
                service: healthData.service,
                environment: healthData.environment
              });
            } else {
              logger.warn("[Setup] Health check response missing publicUrl:", healthData);
              if (mounted) {
                dispatch({ type: 'SET_LOCAL_SERVER', payload: false });
              }
            }
          } else {
            const errorText = await localHealthRes.text();
            logger.warn("[Setup] Health check failed:", {
              status: localHealthRes.status,
              error: errorText
            });
            if (mounted) {
              dispatch({ type: 'SET_LOCAL_SERVER', payload: false });
            }
          }
        } catch (err) {
          logger.warn("[Setup] Error checking local server:", err);
          if (mounted) {
            dispatch({ type: 'SET_LOCAL_SERVER', payload: false });
          }
        }

        if (mounted) {
          dispatch({ type: 'UPDATE_ALL_CHECKS' });
        }
      } catch (err) {
        logger.warn("[Setup] Error in pollChecks:", err);
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
    if (!state.currentNumberSid || !state.publicUrl) return;
    
    const webhookUrl = `${state.publicUrl}/twiml`;
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
    if (!backendUrl) {
      logger.warn("[Setup] NEXT_PUBLIC_BACKEND_URL not set");
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
          voiceUrl: webhookUrl,
        }),
      });
      
      if (!res.ok) {
        const errorText = await res.text();
        logger.warn("[Setup] Failed to update webhook:", errorText);
        throw new Error("Failed to update webhook");
      }
      
      const updatedNumber = await res.json();
      dispatch({ type: 'SET_CURRENT_NUMBER', payload: { 
        sid: updatedNumber.sid,
        voiceUrl: updatedNumber.voiceUrl || "",
        friendlyName: updatedNumber.friendlyName || ""
      }});
    } catch (err) {
      logger.error("[Setup] Error updating webhook:", err);
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
            logger.info("[Setup] Ngrok health check successful:", {
              publicUrl: healthData.environment.publicUrl,
              status: healthData.status,
              service: healthData.service
            });
            dispatch({ type: 'SET_PUBLIC_URL_ACCESSIBLE', payload: true });
            success = true;
            break;
          } else {
            logger.warn("[Setup] Ngrok health check response invalid:", healthData);
          }
        } else {
          const errorText = await resTest.text();
          logger.warn("[Setup] Ngrok health check failed:", {
            status: resTest.status,
            statusText: resTest.statusText,
            error: errorText
          });
        }
      } catch (err) {
        logger.warn("[Setup] Ngrok health check error:", err);
      }
      
      if (i < 4) {
        logger.info(`[Setup] Retrying ngrok check (attempt ${i + 2}/5)...`);
        await new Promise((r) => setTimeout(r, 3000));
      }
    }
    
    if (!success) {
      logger.warn("[Setup] All ngrok health check attempts failed");
      dispatch({ type: 'SET_PUBLIC_URL_ACCESSIBLE', payload: false });
    }
    
    dispatch({ type: 'SET_NGROK_LOADING', payload: false });
  };

  const handleDone = () => {
    if (state.allChecksPassed) {
      setReady(true);
    }
  };

  return (
    <Dialog open={!ready}>
      <DialogContent className="max-w-[600px] max-h-[800px] overflow-hidden flex flex-col p-6">
        <DialogHeader className="pb-4">
          <DialogTitle>Setup Checklist</DialogTitle>
          <DialogDescription>
            This sample app requires a few steps before you get started
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-2">
          <SetupChecklist
            state={state}
            onUpdateWebhook={updateWebhook}
            onCheckNgrok={checkNgrok}
            onNumberChange={(sid) => {
              const selected = state.phoneNumbers.find(p => p.sid === sid);
              if (selected) {
                dispatch({
                  type: 'SET_CURRENT_NUMBER',
                  payload: {
                    sid,
                    voiceUrl: selected.voiceUrl || "",
                    friendlyName: selected.friendlyName || ""
                  }
                });
                setSelectedPhoneNumber(selected.friendlyName || "");
              }
            }}
            setSelectedPhoneNumber={setSelectedPhoneNumber}
          />
        </div>

        <div className="flex flex-col sm:flex-row sm:justify-between items-center gap-4 pt-4 border-t mt-4">
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