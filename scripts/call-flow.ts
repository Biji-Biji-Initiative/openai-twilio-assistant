import WebSocket from 'ws';
import dotenv from 'dotenv';
import path from 'path';
import { twilio } from 'twilio';
import { writeFileSync } from 'fs';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../webapp/.env') });
dotenv.config({ path: path.join(__dirname, '../websocket-server/.env') });

interface CallLog {
  timestamp: string;
  type: 'call' | 'websocket' | 'model' | 'error';
  message: string;
  data?: any;
}

class CallFlowTester {
  private wsLogs: WebSocket | null = null;
  private wsCall: WebSocket | null = null;
  private callSid: string | null = null;
  private logs: CallLog[] = [];
  private twilioClient: any;

  constructor() {
    this.twilioClient = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );
  }

  private log(type: CallLog['type'], message: string, data?: any) {
    const logEntry: CallLog = {
      timestamp: new Date().toISOString(),
      type,
      message,
      data
    };
    this.logs.push(logEntry);
    
    const emoji = {
      call: '📞',
      websocket: '🔌',
      model: '🤖',
      error: '❌'
    };
    console.log(`${emoji[type]} ${message}`);
    if (data) {
      console.log(JSON.stringify(data, null, 2));
    }
  }

  private async connectWebSocket(endpoint: 'call' | 'logs'): Promise<WebSocket> {
    return new Promise((resolve, reject) => {
      const ngrokDomain = process.env.NGROK_DOMAIN || 'mereka.ngrok.io';
      const ws = new WebSocket(`wss://${ngrokDomain}/${endpoint}`);
      
      const timeout = setTimeout(() => {
        ws.close();
        reject(new Error(`WebSocket connection timeout for ${endpoint}`));
      }, 5000);

      ws.on('open', () => {
        clearTimeout(timeout);
        this.log('websocket', `Connected to ${endpoint} endpoint`);
        if (endpoint === 'call') {
          this.wsCall = ws;
        } else {
          this.wsLogs = ws;
        }
        resolve(ws);
      });

      ws.on('message', (data: Buffer) => {
        const message = data.toString();
        this.log('websocket', `Received message on ${endpoint}`, JSON.parse(message));
      });

      ws.on('error', (error) => {
        clearTimeout(timeout);
        this.log('error', `WebSocket error on ${endpoint}`, error);
        reject(error);
      });

      ws.on('close', () => {
        this.log('websocket', `Connection closed for ${endpoint}`);
        if (endpoint === 'call') {
          this.wsCall = null;
        } else {
          this.wsLogs = null;
        }
      });
    });
  }

  private async makeCall(): Promise<string> {
    try {
      const call = await this.twilioClient.calls.create({
        to: process.env.TWILIO_PHONE_NUMBER,
        from: process.env.TWILIO_OUTBOUND_NUMBER,
        url: `https://${process.env.NGROK_DOMAIN}/twiml`
      });
      
      this.callSid = call.sid;
      this.log('call', 'Call initiated', { callSid: call.sid });
      return call.sid;
    } catch (error) {
      this.log('error', 'Failed to initiate call', error);
      throw error;
    }
  }

  private async monitorCallStatus(callSid: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const checkStatus = async () => {
        try {
          const call = await this.twilioClient.calls(callSid).fetch();
          this.log('call', `Call status: ${call.status}`, call);
          
          if (['completed', 'failed', 'busy', 'no-answer'].includes(call.status)) {
            resolve();
          } else {
            setTimeout(checkStatus, 2000);
          }
        } catch (error) {
          this.log('error', 'Failed to check call status', error);
          reject(error);
        }
      };
      
      checkStatus();
    });
  }

  private async cleanup(): Promise<void> {
    if (this.wsCall) {
      this.wsCall.close();
      this.wsCall = null;
    }
    if (this.wsLogs) {
      this.wsLogs.close();
      this.wsLogs = null;
    }
    
    // Save logs
    const filename = `call-flow-test-${new Date().toISOString()}.json`;
    writeFileSync(filename, JSON.stringify({
      timestamp: new Date().toISOString(),
      callSid: this.callSid,
      logs: this.logs
    }, null, 2));
    
    console.log(`\nTest completed. Logs saved to ${filename}`);
  }

  public async testCallFlow(): Promise<void> {
    try {
      // 1. Connect to logs endpoint first
      this.log('websocket', 'Connecting to logs endpoint...');
      await this.connectWebSocket('logs');

      // 2. Connect to call endpoint
      this.log('websocket', 'Connecting to call endpoint...');
      await this.connectWebSocket('call');

      // 3. Make the call
      this.log('call', 'Initiating test call...');
      const callSid = await this.makeCall();

      // 4. Monitor call status and collect logs
      this.log('call', 'Monitoring call status...');
      await this.monitorCallStatus(callSid);

      // 5. Wait for additional logs (30 seconds)
      this.log('websocket', 'Collecting final logs...');
      await new Promise(resolve => setTimeout(resolve, 30000));

    } catch (error) {
      this.log('error', 'Test failed', error);
    } finally {
      await this.cleanup();
    }
  }
}

// Run test if called directly
if (require.main === module) {
  const tester = new CallFlowTester();
  tester.testCallFlow().catch(console.error);
}

export default CallFlowTester;
