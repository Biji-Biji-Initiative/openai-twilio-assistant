import { z } from 'zod';
import { logger } from '../utils/logger';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test'])
    .default('development')
    .describe('Application environment'),
  
  PORT: z.string()
    .default('8081')
    .transform((val: string) => {
      const port = Number(val);
      if (isNaN(port) || port < 1 || port > 65535) {
        throw new Error('Port must be a valid number between 1 and 65535');
      }
      return port;
    })
    .describe('Server port number'),
  
  TWILIO_ACCOUNT_SID: z.string()
    .min(1, 'Twilio Account SID is required')
    .describe('Twilio Account SID'),
  
  TWILIO_AUTH_TOKEN: z.string()
    .min(1, 'Twilio Auth Token is required')
    .describe('Twilio Auth Token'),
  
  TWILIO_PHONE_NUMBER: z.string()
    .min(1, 'Twilio Phone Number is required')
    .describe('Twilio Phone Number'),
  
  PUBLIC_URL: z.string()
    .url()
    .default('http://localhost:8081')
    .describe('Public URL for the server'),
  
  OPENAI_API_KEY: z.string()
    .optional()
    .describe('OpenAI API Key (optional)'),
});

export type EnvConfig = z.infer<typeof envSchema>;

function validateEnv(): EnvConfig {
  try {
    const result = envSchema.safeParse(process.env);
    
    if (!result.success) {
      const formatted = result.error.format();
      type ZodFormattedError = { _errors?: string[] };
      
      const errors = Object.entries(formatted)
        .filter(([key]) => key !== '_errors')
        .map(([key, value]) => ({
          field: key,
          errors: (value as ZodFormattedError)._errors || []
        }))
        .filter(item => item.errors.length > 0);

      logger.error('Environment validation failed. Please check your .env file:', errors);
      process.exit(1);
    }
    
    // Log successful validation
    logger.info('Environment validation successful', {
      NODE_ENV: result.data.NODE_ENV,
      PORT: result.data.PORT,
      PUBLIC_URL: result.data.PUBLIC_URL,
      hasTwilioConfig: true,
      hasOpenAI: !!result.data.OPENAI_API_KEY
    });
    
    return result.data;
  } catch (error) {
    if (error instanceof Error) {
      logger.error('Unexpected error validating environment:', {
        message: error.message,
        stack: error.stack
      });
    } else {
      logger.error('Unknown error validating environment:', error);
    }
    process.exit(1);
  }
}

export const env = validateEnv(); 