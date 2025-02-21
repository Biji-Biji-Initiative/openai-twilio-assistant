"use client";

import React, { useEffect, useState, useMemo } from "react";
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

type ChecklistAndConfigProps = {
  setSelectedPhoneNumber: (number: string) => void;
  setAllConfigsReady: (ready: boolean) => void;
};

export default function ChecklistAndConfig({ setSelectedPhoneNumber, setAllConfigsReady }: ChecklistAndConfigProps) {
  const [ready, setReady] = useState(false);
  const [hasCredentials, setHasCredentials] = useState(false);
  const [phoneNumbers, setPhoneNumbers] = useState<PhoneNumber[]>([]);
  const [currentNumberSid, setCurrentNumberSid] = useState("");
  const [currentVoiceUrl, setCurrentVoiceUrl] = useState("");

  const [publicUrl, setPublicUrl] = useState("");
  const [localServerUp, setLocalServerUp] = useState(false);
  const [publicUrlAccessible, setPublicUrlAccessible] = useState(false);

  const [allChecksPassed, setAllChecksPassed] = useState(false);
  const [webhookLoading, setWebhookLoading] = useState(false);
  const [ngrokLoading, setNgrokLoading] = useState(false);

  const appendedTwimlUrl = publicUrl ? `${publicUrl}/twiml` : "";
  const isWebhookMismatch =
    appendedTwimlUrl && currentVoiceUrl && appendedTwimlUrl !== currentVoiceUrl;

  async function checkNgrok() {
    // Skip ngrok tunnel check since we're using a permanent domain
    if (!localServerUp || !publicUrl) return;

    if (!localServerUp || !publicUrl) return;
    setNgrokLoading(true);
    let success = false;
    for (let i = 0; i < 5; i++) {
      try {
        const resTest = await fetch(publicUrl + "/public-url");
        if (resTest.ok) {
          setPublicUrlAccessible(true);
          success = true;
          break;
        }
      } catch {
        // retry
      }
      if (i < 4) {
        await new Promise((r) => setTimeout(r, 3000));
      }
    }
    if (!success) {
      setPublicUrlAccessible(false);
    }
    setNgrokLoading(false);
  }

  useEffect(() => {
    if (!ready && localServerUp) {
      checkNgrok();
    }
  }, [localServerUp, ready]);

  useEffect(() => {
    if (!allChecksPassed) {
      setReady(false);
    }
  }, [allChecksPassed]);

  useEffect(() => {
    let polling = true;
    let pollCount = 0;
    const MAX_POLLS = 3; // Maximum number of consecutive successful polls
    const POLL_INTERVAL = 5000; // 5 seconds between polls
    let lastPollTime = 0;

    const pollChecks = async () => {
      if (!polling) return;
      
      // Prevent polling more frequently than POLL_INTERVAL
      const now = Date.now();
      if (now - lastPollTime < POLL_INTERVAL) return;
      lastPollTime = now;
      
      // Only log on first poll and when status changes
      if (pollCount === 0) {
        console.log(`[Checklist] Starting configuration checks (Poll 1/${MAX_POLLS})`);
      }
      
      try {
        // 1. Check credentials
        let res = await fetch("/api/twilio");
        if (!res.ok) {
          console.warn("Credentials check failed:", await res.text());
          throw new Error("Failed credentials check");
        }
        const credData = await res.json();
        const hasValidCreds = !!credData?.credentialsSet;
        if (hasValidCreds !== hasCredentials) {
          console.log("✓ Credentials status:", hasValidCreds ? "Valid" : "Invalid");
          setHasCredentials(hasValidCreds);
        }

        // 2. Fetch numbers
        res = await fetch("/api/twilio/numbers");
        if (!res.ok) {
          console.warn("Numbers fetch failed:", await res.text());
          throw new Error("Failed to fetch phone numbers");
        }
        const numbersData = await res.json();
        if (Array.isArray(numbersData) && numbersData.length > 0) {
          // Only update if numbers have changed
          const currentNumbers = JSON.stringify(phoneNumbers);
          const newNumbers = JSON.stringify(numbersData);
          if (currentNumbers !== newNumbers) {
            console.log("✓ Phone numbers updated:", numbersData.length, "numbers found");
            setPhoneNumbers(numbersData);
            // If currentNumberSid not set or not in the list, use first
            const selected =
              numbersData.find((p: PhoneNumber) => p.sid === currentNumberSid) ||
              numbersData[0];
            setCurrentNumberSid(selected.sid);
            setCurrentVoiceUrl(selected.voiceUrl || "");
            setSelectedPhoneNumber(selected.friendlyName || "");
          } else {
            console.log("✓ Phone numbers verified:", numbersData.length, "numbers available");
          }
        }

        // 3. Check local server & public URL
        let foundPublicUrl = "";
        try {
          const resLocal = await fetch("http://localhost:8081/public-url");
          if (resLocal.ok) {
            const pubData = await resLocal.json();
            foundPublicUrl = pubData?.publicUrl || "";
            setLocalServerUp(true);
            if (foundPublicUrl !== publicUrl) {
              console.log("✓ Public URL updated:", foundPublicUrl);
              setPublicUrl(foundPublicUrl);
            } else {
              console.log("✓ Public URL verified:", foundPublicUrl);
            }
          } else {
            throw new Error("Local server not responding");
          }
        } catch {
          if (localServerUp) {
            console.warn("✗ Local server connection lost");
            setLocalServerUp(false);
            setPublicUrl("");
          }
        }

        // Increment successful poll count
        pollCount++;
        
        // If we've had enough successful polls, slow down polling
        if (pollCount >= MAX_POLLS) {
          polling = false;
          console.log("✓ All checks stable, stopping frequent polls");
        }
        
        console.groupEnd();

      } catch (err) {
        console.error('[Checklist] Error in poll checks:', err);
        if (err instanceof Error) {
          console.error('[Checklist] Error details:', err.message);
        }
        // Reset poll count on error
        pollCount = 0;
      }
    };

    // Initial check
    pollChecks();
    
    // Set up polling interval
    const intervalId = setInterval(() => polling && pollChecks(), POLL_INTERVAL);
    
    return () => {
      polling = false;
      clearInterval(intervalId);
    };
  }, [currentNumberSid, setSelectedPhoneNumber]);

  const updateWebhook = async () => {
    if (!currentNumberSid || !appendedTwimlUrl) return;
    try {
      setWebhookLoading(true);
      const res = await fetch("/api/twilio/numbers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phoneNumberSid: currentNumberSid,
          voiceUrl: appendedTwimlUrl,
        }),
      });
      if (!res.ok) throw new Error("Failed to update webhook");
      setCurrentVoiceUrl(appendedTwimlUrl);
    } catch (err) {
      console.error(err);
    } finally {
      setWebhookLoading(false);
    }
  };

  const checklist = useMemo(() => {
    return [
      {
        label: "Set up Twilio account",
        done: hasCredentials,
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
        done: phoneNumbers.length > 0,
        description: "Costs around $1.15/month",
        field:
          phoneNumbers.length > 0 ? (
            phoneNumbers.length === 1 ? (
              <Input value={phoneNumbers[0].friendlyName || ""} disabled />
            ) : (
              <Select
                onValueChange={(value) => {
                  setCurrentNumberSid(value);
                  const selected = phoneNumbers.find((p) => p.sid === value);
                  if (selected) {
                    setSelectedPhoneNumber(selected.friendlyName || "");
                    setCurrentVoiceUrl(selected.voiceUrl || "");
                  }
                }}
                value={currentNumberSid}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a phone number" />
                </SelectTrigger>
                <SelectContent>
                  {phoneNumbers.map((phone) => (
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
        done: localServerUp,
        description: "cd websocket-server && npm run dev",
        field: null,
      },
      {
        label: "Start ngrok",
        done: publicUrlAccessible,
        description: "Then set ngrok URL in websocket-server/.env",
        field: (
          <div className="flex items-center gap-2 w-full">
            <div className="flex-1">
              <Input value={publicUrl} disabled />
            </div>
            <div className="flex-1">
              <Button
                variant="outline"
                onClick={checkNgrok}
                disabled={ngrokLoading || !localServerUp || !publicUrl}
                className="w-full"
              >
                {ngrokLoading ? (
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
        done: !!publicUrl && !isWebhookMismatch,
        description: "Can also be done manually in Twilio console",
        field: (
          <div className="flex items-center gap-2 w-full">
            <div className="flex-1">
              <Input value={currentVoiceUrl} disabled className="w-full" />
            </div>
            <div className="flex-1">
              <Button
                onClick={updateWebhook}
                disabled={webhookLoading}
                className="w-full"
              >
                {webhookLoading ? (
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
    hasCredentials,
    phoneNumbers,
    currentNumberSid,
    localServerUp,
    publicUrl,
    publicUrlAccessible,
    currentVoiceUrl,
    isWebhookMismatch,
    appendedTwimlUrl,
    webhookLoading,
    ngrokLoading,
    setSelectedPhoneNumber,
  ]);

  useEffect(() => {
    setAllChecksPassed(checklist.every((item) => item.done));
  }, [checklist]);

  useEffect(() => {
    if (!ready) {
      checkNgrok();
    }
  }, [localServerUp, ready]);

  useEffect(() => {
    if (!allChecksPassed) {
      setReady(false);
    }
  }, [allChecksPassed]);

  /**
   * Marks the checklist as completed.
   *
   * This is called when the user has completed all the steps in the checklist.
   * It sets the `ready` state to `true`, which allows the app to render the
   * call interface.
   */
  const handleDone = () => {
    // First mark as ready to close dialog
    setReady(true);
    
    // Then signal completion to parent
    requestAnimationFrame(() => {
      setAllConfigsReady(true);
      console.log('Checklist completed, signaling ready state');
    });
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
            disabled={!allChecksPassed}
          >
            Let's go!
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
