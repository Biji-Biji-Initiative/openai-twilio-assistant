"use client";

import React, { useEffect, useCallback } from 'react';
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

const POLL_INTERVAL = 5000; // 5 seconds
const MAX_RETRIES = 3;

export function SetupDialog({ ready, setReady, selectedPhoneNumber, setSelectedPhoneNumber }: SetupProps) {
  const [state, dispatch] = React.useReducer(setupReducer, initialState);
  const [retryCount, setRetryCount] = React.useState<Record<string, number>>({});

  const handleError = useCallback((step: string, error: any) => {
    logger.error(`[Setup] ${step} failed:`, error);
    setRetryCount(prev => ({
      ...prev,
      [step]: (prev[step] || 0) + 1
    }));
    return false;
  }, []);

  const checkCredentials = useCallback(async () => {
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
      if (!backendUrl) {
        throw new Error("NEXT_PUBLIC_BACKEND_URL not set");
      }

      const res = await fetch(`${backendUrl}/api/twilio`, {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache',
          'Accept': 'application/json'
        }
      });

      if (!res.ok) {
        throw new Error(await res.text());
      }

      const data = await res.json();
      dispatch({ type: 'SET_CREDENTIALS', payload: !!data?.credentialsSet });
      return true;
    } catch (error) {
      return handleError('credentials', error);
    }
  }, [handleError]);

  const checkPhoneNumbers = useCallback(async () => {
    if (!state.hasCredentials) return false;

    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
      if (!backendUrl) {
        throw new Error("NEXT_PUBLIC_BACKEND_URL not set");
      }

      const res = await fetch(`${backendUrl}/api/twilio/numbers`);
      if (!res.ok) {
        throw new Error(await res.text());
      }

      const numbers = await res.json();
      dispatch({ type: 'SET_PHONE_NUMBERS', payload: numbers });

      if (numbers.length > 0) {
        const defaultNumber = numbers[0];
        dispatch({
          type: 'SET_CURRENT_NUMBER',
          payload: {
            sid: defaultNumber.sid,
            voiceUrl: defaultNumber.voiceUrl || "",
            friendlyName: defaultNumber.friendlyName || ""
          }
        });
        setSelectedPhoneNumber(defaultNumber.friendlyName || "");
      }
      return true;
    } catch (error) {
      return handleError('phone_numbers', error);
    }
  }, [state.hasCredentials, handleError, setSelectedPhoneNumber]);

  const checkLocalServer = useCallback(async () => {
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
      if (!backendUrl) {
        throw new Error("NEXT_PUBLIC_BACKEND_URL not set");
      }

      const res = await fetch(`${backendUrl}/health`);
      if (!res.ok) {
        throw new Error(await res.text());
      }

      dispatch({ type: 'SET_LOCAL_SERVER', payload: true });
      dispatch({ type: 'SET_PUBLIC_URL', payload: backendUrl });
      return true;
    } catch (error) {
      return handleError('local_server', error);
    }
  }, [handleError]);

  const checkNgrok = useCallback(async () => {
    if (!state.localServerUp) {
      logger.info('[Setup] Skipping ngrok check - local server not up');
      return false;
    }

    try {
      logger.info('[Setup] Checking ngrok tunnel...');
      dispatch({ type: 'SET_NGROK_LOADING', payload: true });
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
      if (!backendUrl) {
        throw new Error("NEXT_PUBLIC_BACKEND_URL not set");
      }

      const res = await fetch(`${backendUrl}/health`);
      if (!res.ok) {
        throw new Error(await res.text());
      }

      logger.info('[Setup] Ngrok tunnel is accessible');
      dispatch({ type: 'SET_PUBLIC_URL_ACCESSIBLE', payload: true });
      return true;
    } catch (error) {
      return handleError('ngrok', error);
    } finally {
      dispatch({ type: 'SET_NGROK_LOADING', payload: false });
    }
  }, [state.localServerUp, handleError]);

  const updateWebhook = async (): Promise<void> => {
    if (!state.publicUrlAccessible || !state.currentNumberSid) return;

    try {
      dispatch({ type: 'SET_WEBHOOK_LOADING', payload: true });
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
      if (!backendUrl) {
        throw new Error("NEXT_PUBLIC_BACKEND_URL not set");
      }

      const res = await fetch(`${backendUrl}/api/twilio/numbers/${state.currentNumberSid}/webhook`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          url: `${backendUrl}/twiml`
        })
      });

      if (!res.ok) {
        throw new Error(await res.text());
      }

      const data = await res.json();
      dispatch({
        type: 'SET_CURRENT_NUMBER',
        payload: {
          sid: data.sid,
          voiceUrl: data.voiceUrl,
          friendlyName: data.friendlyName
        }
      });
    } catch (error) {
      handleError('webhook', error);
    } finally {
      dispatch({ type: 'SET_WEBHOOK_LOADING', payload: false });
    }
  };

  useEffect(() => {
    let mounted = true;
    let timeoutId: NodeJS.Timeout;

    const pollChecks = async () => {
      if (!mounted || ready) return;

      try {
        dispatch({ type: 'SET_POLLING', payload: true });
        logger.info('[Setup] Starting setup checks...');

        // Run checks in sequence
        const checks = [
          { name: 'credentials', fn: checkCredentials },
          { name: 'phone_numbers', fn: checkPhoneNumbers },
          { name: 'local_server', fn: checkLocalServer },
          { name: 'ngrok', fn: checkNgrok }
        ];

        for (const check of checks) {
          if (retryCount[check.name] >= MAX_RETRIES) {
            logger.error(`[Setup] ${check.name} check failed after ${MAX_RETRIES} retries`);
            continue;
          }

          logger.info(`[Setup] Running ${check.name} check...`);
          const success = await check.fn();
          if (!success) {
            logger.warn(`[Setup] ${check.name} check failed, stopping sequence`);
            break;
          }
          logger.info(`[Setup] ${check.name} check passed`);
        }

        dispatch({ type: 'UPDATE_ALL_CHECKS' });
      } finally {
        if (mounted) {
          dispatch({ type: 'SET_POLLING', payload: false });
          timeoutId = setTimeout(pollChecks, POLL_INTERVAL);
        }
      }
    };

    pollChecks();

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
    };
  }, [ready, checkCredentials, checkPhoneNumbers, checkLocalServer, checkNgrok, retryCount]);

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
            onCheckNgrok={async () => {
              await checkNgrok();
            }}
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