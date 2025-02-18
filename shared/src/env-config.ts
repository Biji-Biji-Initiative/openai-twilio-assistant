import { z } from 'zod';

// Base environment schema shared between all services
const baseEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test'])
    .default('development'),
  
  TWILIO_ACCOUNT_SID: z.string()
    .min(1, 'Twilio Account SID is required'),
  
  TWILIO_AUTH_TOKEN: z.string()
    .min(1, 'Twilio Auth Token is required'),
  
  TWILIO_PHONE_NUMBER: z.string()
    .min(1, 'Twilio Phone Number is required'),
  
  OPENAI_API_KEY: z.string()
    .optional()
    .describe('OpenAI API Key (optional)'),
});

// WebSocket server specific schema
export const wsServerEnvSchema = baseEnvSchema.extend({
  PORT: z.string()
    .default('8081')
    .transform((val) => {
      const port = Number(val);
      if (isNaN(port) || port < 1 || port > 65535) {
        throw new Error('Port must be a valid number between 1 and 65535');
      }
      return port;
    }),
  
  PUBLIC_URL: z.string()
    .url()
    .default('http://localhost:8081'),
});

// Dev phone server specific schema
export const devPhoneEnvSchema = baseEnvSchema.extend({
  DEV_PHONE_PORT: z.string()
    .default('3001')
    .transform((val) => {
      const port = Number(val);
      if (isNaN(port) || port < 1 || port > 65535) {
        throw new Error('Port must be a valid number between 1 and 65535');
      }
      return port;
    }),
});

// Web app specific schema
export const webappEnvSchema = baseEnvSchema.extend({
  NEXT_PUBLIC_BACKEND_URL: z.string()
    .url()
    .default('http://localhost:8081'),
  
  NEXT_PUBLIC_DEV_PHONE_URL: z.string()
    .url()
    .default('http://localhost:3001'),
});

export type WebSocketServerEnv = z.infer<typeof wsServerEnvSchema>;
export type DevPhoneEnv = z.infer<typeof devPhoneEnvSchema>;
export type WebappEnv = z.infer<typeof webappEnvSchema>;

export function validateEnv<T extends z.ZodSchema>(
  schema: T,
  env: NodeJS.ProcessEnv = process.env
): z.infer<T> {
  try {
    const result = schema.safeParse(env);
    
    if (!result.success) {
      const formatted = result.error.format();
      const errors = Object.entries(formatted)
        .filter(([key]) => key !== '_errors')
        .map(([key, value]) => ({
          field: key,
          errors: (value as any)._errors || []
        }))
        .filter(item => item.errors.length > 0);

      console.error('Environment validation failed:', errors);
      process.exit(1);
    }
    
    return result.data;
  } catch (error) {
    console.error('Unexpected error validating environment:', error);
    process.exit(1);
  }
} 