import { z } from 'zod';
import { logger } from '../utils/logger';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).default('8081'),
  TWILIO_ACCOUNT_SID: z.string(),
  TWILIO_AUTH_TOKEN: z.string(),
  TWILIO_PHONE_NUMBER: z.string(),
  PUBLIC_URL: z.string().default('http://localhost:8081'),
  OPENAI_API_KEY: z.string().optional(),
});

export type EnvConfig = z.infer<typeof envSchema>;

function validateEnv(): EnvConfig {
  try {
    const result = envSchema.safeParse(process.env);
    
    if (!result.success) {
      logger.error('Environment validation failed:', 
        JSON.stringify(result.error.format(), null, 2)
      );
      process.exit(1);
    }
    
    return result.data;
  } catch (error) {
    logger.error('Unexpected error validating environment:', error);
    process.exit(1);
  }
}

export const env = validateEnv(); 