import { z } from 'zod';
import { CALL_STATUS } from '../constants';

// Call-related schemas
export const outboundCallSchema = z.object({
  to: z.string().min(1).regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format')
});

export const callStatusSchema = z.object({
  CallSid: z.string(),
  CallStatus: z.enum(Object.values(CALL_STATUS) as [string, ...string[]]),
  Duration: z.string().optional(),
  ErrorCode: z.string().optional(),
  ErrorMessage: z.string().optional(),
  Direction: z.enum(['inbound', 'outbound-api']),
  From: z.string(),
  To: z.string()
});

export const updateWebhookSchema = z.object({
  phoneNumberSid: z.string().min(1),
  voiceUrl: z.string().url('Invalid webhook URL')
});

// WebSocket message schemas
export const wsMessageSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('call.action'),
    action: z.enum(['disconnect']),
    callSid: z.string()
  }),
  z.object({
    type: z.literal('call.status'),
    callSid: z.string(),
    status: z.enum(Object.values(CALL_STATUS) as [string, ...string[]]),
    duration: z.number().optional()
  })
]);

// Types derived from schemas
export type OutboundCallRequest = z.infer<typeof outboundCallSchema>;
export type CallStatusUpdate = z.infer<typeof callStatusSchema>;
export type UpdateWebhookRequest = z.infer<typeof updateWebhookSchema>;
export type WebSocketMessage = z.infer<typeof wsMessageSchema>; 