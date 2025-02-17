import { z } from 'zod';

/**
 * Phone number regex for E.164 format validation
 * Allows for:
 * - Optional + prefix
 * - 1-15 digits
 * - Must start with a non-zero digit
 */
const PHONE_NUMBER_REGEX = /^\+?[1-9]\d{1,14}$/;

/**
 * Base schema for all API responses
 */
export const ApiResponseSchema = z.object({
  timestamp: z.string().datetime(),
  requestId: z.string().uuid(),
});

/**
 * Error response schema
 */
export const ErrorResponseSchema = ApiResponseSchema.extend({
  error: z.string(),
  code: z.number(),
  type: z.enum([
    'VALIDATION_ERROR',
    'AUTHENTICATION_ERROR',
    'TWILIO_ERROR',
    'OPENAI_ERROR',
    'WEBSOCKET_ERROR',
    'INTERNAL_ERROR',
    'RATE_LIMIT_ERROR'
  ]),
});

/**
 * Success response schema
 */
export const SuccessResponseSchema = ApiResponseSchema.extend({
  data: z.unknown(),
});

/**
 * Outbound call request schema
 */
export const OutboundCallSchema = z.object({
  phoneNumber: z.string().regex(PHONE_NUMBER_REGEX, 'Invalid phone number format'),
  callType: z.enum(['stream', 'gather']),
  greeting: z.string().optional(),
  publicUrl: z.string().url().optional(),
});

/**
 * Phone number update schema
 */
export const PhoneNumberUpdateSchema = z.object({
  phoneNumberSid: z.string(),
  voiceUrl: z.string().url(),
});

/**
 * TwiML request schema
 */
export const TwiMLRequestSchema = z.object({
  callType: z.enum(['stream', 'gather']),
  publicUrl: z.string().url().optional(),
  greeting: z.string().optional(),
});

/**
 * Transcription request schema
 */
export const TranscriptionRequestSchema = z.object({
  SpeechResult: z.string().optional(),
});

// Type exports
export type ApiResponse = z.infer<typeof ApiResponseSchema>;
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;
export type SuccessResponse = z.infer<typeof SuccessResponseSchema>;
export type OutboundCallRequest = z.infer<typeof OutboundCallSchema>;
export type PhoneNumberUpdateRequest = z.infer<typeof PhoneNumberUpdateSchema>;
export type TwiMLRequest = z.infer<typeof TwiMLRequestSchema>;
export type TranscriptionRequest = z.infer<typeof TranscriptionRequestSchema>; 