import axios from 'axios';
import { Twilio } from 'twilio';
import { logger } from './logger';
import { CONFIG } from './config';
import { websocketManager } from './websocket';

/**
 * Validates Twilio account status
 */
async function validateTwilio(): Promise<boolean> {
  try {
    const client = new Twilio(CONFIG.twilio.accountSid, CONFIG.twilio.authToken);
    const account = await client.api.accounts(CONFIG.twilio.accountSid).fetch();

    // Fixed the account status check
    if (account.status !== 'active') {
      throw new Error(`Twilio account is not active (status: ${account.status})`);
    }

    logger.success('Twilio account validated successfully');
    return true;
  } catch (error) {
    logger.error('Failed to validate Twilio account', error as Error);
    return false;
  }
}

/**
 * Validates ngrok tunnel status
 */
async function validateNgrok(): Promise<boolean> {
  try {
    // Using axios instead of fetch for consistency
    const response = await axios.get(`https://${CONFIG.ngrok.domain}/health`);
    
    if (response.status !== 200) {
      throw new Error(`Ngrok health check failed: ${response.status}`);
    }

    logger.success('Ngrok tunnel validated successfully');
    return true;
  } catch (error) {
    logger.error('Failed to validate ngrok tunnel', error as Error);
    return false;
  }
}

/**
 * Validates OpenAI API key
 */
async function validateOpenAI(): Promise<boolean> {
  try {
    const response = await axios.get('https://api.openai.com/v1/models', {
      headers: {
        'Authorization': `Bearer ${CONFIG.openai.apiKey}`
      }
    });

    if (response.status !== 200) {
      throw new Error(`OpenAI API check failed: ${response.status}`);
    }

    logger.success('OpenAI API key validated successfully');
    return true;
  } catch (error) {
    logger.error('Failed to validate OpenAI API key', error as Error);
    return false;
  }
}

/**
 * Validates WebSocket connection
 */
async function validateWebSocket(): Promise<boolean> {
  try {
    await websocketManager.connect(`ws://localhost:${CONFIG.ports.websocket}/logs`);
    logger.success('WebSocket connection validated successfully');
    return true;
  } catch (error) {
    logger.error('Failed to validate WebSocket connection', error as Error);
    return false;
  } finally {
    websocketManager.disconnect();
  }
}

/**
 * Validates all external service connections
 */
export async function validateConnections(): Promise<boolean> {
  logger.info('Starting connection validation...');

  const results = await Promise.all([
    validateTwilio(),
    validateNgrok(),
    validateOpenAI(),
    validateWebSocket()
  ]);

  const allValid = results.every(result => result);

  if (allValid) {
    logger.success('All connections validated successfully');
  } else {
    logger.error('One or more connection validations failed');
  }

  return allValid;
}
