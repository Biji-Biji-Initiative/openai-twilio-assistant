import { z } from 'zod';

export const logContextSchema = z.object({
  service: z.string().optional(),
  sessionId: z.string().optional(),
  userId: z.string().optional(),
  requestId: z.string().optional(),
  signal: z.string().optional(),
  type: z.string().optional(),
  origin: z.string().optional(),
  port: z.number().optional(),
  publicUrl: z.string().optional(),
  environment: z.string().optional(),
  ip: z.string().optional(),
  userAgent: z.string().optional(),
  duration: z.number().optional(),
  method: z.string().optional(),
  url: z.string().optional(),
  status: z.number().optional(),
  sessionCount: z.number().optional(),
  state: z.string().optional(),
  lastActivity: z.string().optional(),
  inactiveTime: z.number().optional(),
  remainingConnections: z.number().optional(),
  totalConnections: z.number().optional(),
  phoneNumber: z.string().optional(),
  callSid: z.string().optional(),
  callStatus: z.string().optional(),
  callDuration: z.string().optional(),
  stats: z.object({
    total: z.number(),
    connected: z.number(),
    connecting: z.number(),
    reconnecting: z.number(),
    disconnected: z.number(),
    failed: z.number()
  }).optional()
});

export type LogContext = z.infer<typeof logContextSchema>; 