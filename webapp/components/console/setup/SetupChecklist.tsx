"use client";

import React from 'react';
import { Circle, CheckCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChecklistItem, ChecklistState } from '@/types/setup';

interface SetupChecklistProps {
  state: ChecklistState;
  onUpdateWebhook: () => Promise<void>;
  onCheckNgrok: () => Promise<void>;
  onNumberChange: (sid: string) => void;
  setSelectedPhoneNumber: (number: string) => void;
}

export function SetupChecklist({
  state,
  onUpdateWebhook,
  onCheckNgrok,
  onNumberChange,
  setSelectedPhoneNumber,
}: SetupChecklistProps) {
  const appendedTwimlUrl = state.publicUrl ? `${state.publicUrl}/twiml` : "";
  const isWebhookMismatch = appendedTwimlUrl && state.currentVoiceUrl && appendedTwimlUrl !== state.currentVoiceUrl;

  const checklist = React.useMemo(() => {
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
                    onNumberChange(value);
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
                onClick={onCheckNgrok}
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
                onClick={onUpdateWebhook}
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
    state.webhookLoading,
    state.ngrokLoading,
    onUpdateWebhook,
    onCheckNgrok,
    onNumberChange,
    setSelectedPhoneNumber,
  ]);

  return (
    <div className="space-y-4">
      {checklist.map((item, i) => (
        <div
          key={i}
          className="flex items-start gap-4 py-3 border-b last:border-b-0"
        >
          <div className="flex-none pt-1">
            {item.loading ? (
              <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
            ) : item.done ? (
              <CheckCircle className="h-4 w-4 text-green-500" />
            ) : (
              <Circle className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
          <div className="flex-1 min-w-0 space-y-2">
            <div>
              <div className="text-sm font-medium leading-none">
                {item.label}
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                {item.error ? (
                  <span className="text-red-500">{item.error}</span>
                ) : (
                  item.description
                )}
              </div>
            </div>
            {item.field && (
              <div className="w-full">
                {item.field}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
} 