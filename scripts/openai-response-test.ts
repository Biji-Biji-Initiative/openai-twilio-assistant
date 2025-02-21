/**
 * openai-response-test.ts
 *
 * This script tests the end-to-end integration between Twilio and OpenAI.
 * It performs the following steps:
 *  1. Connects to a logs WebSocket endpoint (via Ngrok) to capture events.
 *  2. Initiates a test call using Twilio’s API (using the /test-twiml endpoint).
 *  3. Waits for:
 *      - The Twilio "start" event (indicating that the media stream has begun)
 *      - A "media" event (confirming that audio data is being received)
 *      - An OpenAI response event (model_response or model_event)
 *  4. Logs all events and saves the results to a JSON file.
 *
 * Note: This test relies on your /test-twiml endpoint returning valid TwiML that keeps
 * the call active long enough for audio to be captured.
 */

import { Twilio } from 'twilio';
import dotenv from 'dotenv';
import WebSocket from 'ws';
import path from 'path';
import { writeFileSync } from 'fs';

// Load environment variables from your .env files.
dotenv.config({ path: path.join(__dirname, '../webapp/.env') });
dotenv.config({ path: path.join(__dirname, '../websocket-server/.env') });

class OpenAIResponseTester {
  private twilioClient: Twilio;
  private wsLogs: WebSocket | null = null;
  private openAiResponse: string | null = null;
  private testTimeout: NodeJS.Timeout | null = null;
  private logs: any[] = [];

  // Flags to track media events.
  private streamStarted: boolean = false;
  private hasAudioData: boolean = false;

  constructor() {
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
      throw new Error('Missing Twilio credentials');
    }
    this.twilioClient = new Twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );
  }

  /**
   * Logs messages with a timestamp and type.
   */
  private log(type: string, message: string, data?: any) {
    const entry = {
      timestamp: new Date().toISOString(),
      type,
      message,
      ...(data && { data })
    };
    this.logs.push(entry);
    console.log(`[${entry.timestamp}] [${type}] ${message}`, data || '');
  }

  /**
   * Runs the complete test:
   * 1. Connects to the logs WebSocket.
   * 2. Initiates a test call via Twilio using /test-twiml.
   * 3. Waits for media stream start, audio data, and an OpenAI response.
   * 4. Logs and saves the results.
   */
  async runTest(): Promise<void> {
    this.log('test', 'Starting OpenAI response test...');
    try {
      // Connect to the logs WebSocket.
      this.log('websocket', 'Connecting to logs endpoint...');
      await this.connectToLogs();

      // Initiate the test call.
      this.log('call', 'Initiating test call...');
      const call = await this.makeTestCall();
      this.log('call', `Call initiated with SID: ${call.sid}`);

      // Wait for the media stream to start.
      this.log('call', 'Waiting for media stream to start...');
      await this.waitForStreamStart();
      this.log('call', 'Media stream has started.');

      // Wait for audio data (e.g., from a prerecorded file).
      this.log('call', 'Waiting for audio data...');
      await this.waitForAudioData();
      this.log('call', 'Audio data is being received.');

      // Wait for an OpenAI response.
      this.log('model', 'Waiting for OpenAI response...');
      const response = await this.waitForResponse();
      if (response) {
        this.log('test', '✅ Test passed!', { response });
      } else {
        throw new Error('No response received from OpenAI within timeout');
      }
    } catch (error: any) {
      this.log('error', '❌ Test failed', { error: error.message });
      throw error;
    } finally {
      this.cleanup();
      this.saveResults();
    }
  }

  /**
   * Connects to the logs WebSocket endpoint (via Ngrok).
   */
  private async connectToLogs(): Promise<void> {
    return new Promise((resolve, reject) => {
      const ngrokDomain = process.env.NGROK_DOMAIN;
      if (!ngrokDomain) return reject(new Error('NGROK_DOMAIN not set'));
      const ws = new WebSocket(`wss://${ngrokDomain}/logs`, { rejectUnauthorized: false });
      const timeout = setTimeout(() => {
        ws.close();
        reject(new Error('WebSocket connection timeout'));
      }, 5000);

      ws.on('open', () => {
        clearTimeout(timeout);
        this.log('websocket', 'Connected to logs endpoint');
        this.wsLogs = ws;
        resolve();
      });

      ws.on('message', (data) => {
        try {
          const msg = JSON.parse(data.toString());
          this.log('websocket', 'Received message', msg);
          // Handle Twilio media events.
          if (msg.type === 'twilio_event') {
            if (msg.data && msg.data.event === 'start') {
              this.streamStarted = true;
              this.log('call', 'Media stream start event received', msg.data);
            } else if (msg.data && msg.data.event === 'media') {
              if (msg.data.media && msg.data.media.payload) {
                this.hasAudioData = true;
                this.log('call', 'Media event with audio data received', msg.data);
              }
            }
          } else if (msg.type === 'input_audio_buffer.speech_started') {
            this.hasAudioData = true;
            this.log('call', 'Speech started event received', msg);
          }
          // Handle OpenAI events.
          if (msg.type === 'model_response' || msg.type === 'model_event') {
            this.openAiResponse = msg.text || msg.delta;
            this.log('model', 'OpenAI response received', { response: this.openAiResponse });
          }
        } catch (error) {
          this.log('error', 'Failed to parse WebSocket message', { error });
        }
      });

      ws.on('error', (error) => {
        clearTimeout(timeout);
        this.log('error', 'WebSocket error', { error });
        reject(error);
      });

      ws.on('close', () => {
        this.log('websocket', 'Connection closed');
        this.wsLogs = null;
      });
    });
  }

  /**
   * Initiates a test call using Twilio's API.
   * The call uses the /test-twiml endpoint so that the proper TwiML (with media streaming) is returned.
   */
  private async makeTestCall() {
    const ngrokDomain = process.env.NGROK_DOMAIN;
    const inboundNumber = process.env.TWILIO_INBOUND_NUMBER;
    const outboundNumber = process.env.TWILIO_OUTBOUND_NUMBER;
    if (!ngrokDomain || !inboundNumber || !outboundNumber) {
      throw new Error('Missing required environment variables');
    }
    return this.twilioClient.calls.create({
      to: inboundNumber,
      from: outboundNumber,
      url: `https://${ngrokDomain}/test-twiml`,
      statusCallback: `https://${ngrokDomain}/api/call/status`,
      statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
      statusCallbackMethod: 'POST'
    });
  }

  /**
   * Waits for the "start" event indicating that the media stream has begun.
   */
  private waitForStreamStart(): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Timeout waiting for media stream to start')), 10000);
      const interval = setInterval(() => {
        if (this.streamStarted) {
          clearTimeout(timeout);
          clearInterval(interval);
          resolve();
        }
      }, 500);
    });
  }

  /**
   * Waits for a "media" event (or speech_started) confirming that audio data is being received.
   */
  private waitForAudioData(): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Timeout waiting for audio data')), 30000);
      const interval = setInterval(() => {
        if (this.hasAudioData) {
          clearTimeout(timeout);
          clearInterval(interval);
          resolve();
        }
      }, 500);
    });
  }

  /**
   * Waits for an OpenAI response event.
   */
  private waitForResponse(): Promise<string | null> {
    return new Promise((resolve) => {
      this.testTimeout = setTimeout(() => resolve(this.openAiResponse), 30000);
    });
  }

  /**
   * Clears timeouts and closes the WebSocket connection.
   */
  private cleanup() {
    if (this.testTimeout) {
      clearTimeout(this.testTimeout);
      this.testTimeout = null;
    }
    if (this.wsLogs) {
      this.wsLogs.close();
      this.wsLogs = null;
    }
  }

  /**
   * Saves the test results (including logs and the OpenAI response) to a JSON file.
   */
  private saveResults() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = path.join(__dirname, `openai-response-test-${timestamp}.json`);
    const results = {
      timestamp,
      success: this.openAiResponse !== null,
      response: this.openAiResponse,
      logs: this.logs
    };
    try {
      writeFileSync(filename, JSON.stringify(results, null, 2));
      this.log('test', `Results saved to ${filename}`);
    } catch (error) {
      this.log('error', 'Failed to save results', { error });
    }
  }
}

// Run the test if executed directly.
if (require.main === module) {
  const tester = new OpenAIResponseTester();
  tester.runTest().catch((error) => {
    console.error('Test failed:', error);
    process.exit(1);
  });
}

export default OpenAIResponseTester;