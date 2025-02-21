import WebSocket from 'ws';
import dotenv from 'dotenv';
import path from 'path';
import axios from 'axios';
import { performance } from 'perf_hooks';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../webapp/.env') });
dotenv.config({ path: path.join(__dirname, '../websocket-server/.env') });

interface TestResult {
  success: boolean;
  message: string;
  error?: any;
  timing?: {
    start: number;
    end: number;
    duration: number;
  };
}

interface TestMetrics {
  connectionTimes: {
    logs?: number;
    call?: number;
    openai?: number;
  };
  messageLatencies: number[];
  errors: string[];
}

class ConnectionSequenceTester {
  private metrics: TestMetrics = {
    connectionTimes: {},
    messageLatencies: [],
    errors: []
  };

  private env!: { publicUrl: string };

  private recordError(message: string) {
    console.error('❌', message);
    this.metrics.errors.push(message);
  }

  private async validateEndpoints(): Promise<TestResult> {
    console.log('\n🔄 Testing HTTP Endpoints...');
    try {
      const start = performance.now();
      
      // Test /twiml endpoint
      const twimlResponse = await axios.get(`${this.env.publicUrl}/twiml`);
      if (twimlResponse.status !== 200) {
        return {
          success: false,
          message: `TwiML check failed with status ${twimlResponse.status}`,
          timing: { start, end: performance.now(), duration: performance.now() - start }
        };
      }
      if (!twimlResponse.data.includes('<?xml')) {
        return {
          success: false,
          message: 'TwiML response is not valid XML',
          timing: { start, end: performance.now(), duration: performance.now() - start }
        };
      }
      console.log('✅ TwiML endpoint OK');



      const end = performance.now();
      return {
        success: true,
        message: 'All endpoints validated',
        timing: { start, end, duration: end - start }
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Endpoint validation failed: ${error.message}`,
        error
      };
    }
  }

  private async testMessageFlow(ws: WebSocket): Promise<TestResult> {
    console.log('\n🔄 Testing message flow...');
    
    return new Promise((resolve) => {
      const start = performance.now();
      let messageReceived = false;

      // Listen for response
      ws.on('message', (data) => {
        const end = performance.now();
        messageReceived = true;
        
        try {
          const response = JSON.parse(data.toString());
          this.metrics.messageLatencies.push(end - start);
          
          console.log('✅ Received response:', response.type);
          resolve({
            success: true,
            message: 'Message flow successful',
            timing: { start, end, duration: end - start }
          });
        } catch (error: any) {
          resolve({
            success: false,
            message: `Failed to parse response: ${error.message}`,
            error
          });
        }
      });

      // Send test message
      ws.send(JSON.stringify({
        type: 'ping',
        timestamp: Date.now()
      }));

      // Set timeout
      setTimeout(() => {
        if (!messageReceived) {
          resolve({
            success: false,
            message: 'Message flow timeout - no response received',
            timing: { start, end: performance.now(), duration: 5000 }
          });
        }
      }, 5000);
    });
  }

  private async testErrorHandling(ws: WebSocket): Promise<TestResult> {
    console.log('\n🔄 Testing error handling...');
    
    return new Promise((resolve) => {
      const start = performance.now();
      
      // Send invalid message
      ws.send('invalid json');
      
      ws.on('error', (error) => {
        const end = performance.now();
        console.log('✅ Error handled correctly');
        resolve({
          success: true,
          message: 'Error handling successful',
          timing: { start, end, duration: end - start }
        });
      });
      
      setTimeout(() => {
        resolve({
          success: false,
          message: 'Error handling timeout - no error event received',
          timing: { start, end: performance.now(), duration: 5000 }
        });
      }, 5000);
    });
  }
  private async testConnection(
    name: string,
    url: string,
    options?: WebSocket.ClientOptions,
    onOpen?: (ws: WebSocket) => void
  ): Promise<TestResult> {
    console.log(`\n🔄 Testing ${name}...`);
    
    try {
      const ws = new WebSocket(url, options);
      
      const result = await new Promise<TestResult>((resolve) => {
        const timeout = setTimeout(() => {
          ws.close();
          resolve({
            success: false,
            message: `${name} connection timeout after 5s`,
          });
        }, 5000);
        
        ws.on('open', () => {
          clearTimeout(timeout);
          console.log(`✅ ${name} connected`);
          
          if (onOpen) {
            onOpen(ws);
          }
          
          resolve({
            success: true,
            message: `${name} connection successful`
          });
        });
        
        ws.on('error', (error) => {
          clearTimeout(timeout);
          ws.close();
          resolve({
            success: false,
            message: `${name} connection failed`,
            error
          });
        });
      });

      return result;
    } catch (error) {
      return {
        success: false,
        message: `${name} connection error`,
        error
      };
    }
  }

  private validateEnvironment(): void {
    if (!process.env.PUBLIC_URL) {
      throw new Error('PUBLIC_URL environment variable is not set');
    }
    this.env = { publicUrl: process.env.PUBLIC_URL };
  }

  public async testSequence(): Promise<void> {
    this.validateEnvironment();
    const startTime = performance.now();
    console.log('\n🔍 Testing Connection Sequence');
    console.log('Following OpenAI demo pattern: logs -> call -> OpenAI\n');
    
    try {
      // Step 1: Test logs endpoint
      const logsResult = await this.testConnection(
        'Logs Endpoint',
        `${this.env.publicUrl.replace('https://', 'wss://')}/logs`,
        { rejectUnauthorized: false }
      );
      
      if (!logsResult.success) {
        throw new Error(`Logs endpoint failed: ${logsResult.message}`);
      }

      // Step 2: Test call endpoint
      const callResult = await this.testConnection(
        'Call Endpoint',
        `${this.env.publicUrl.replace('https://', 'wss://')}/call`,
        { rejectUnauthorized: false }
      );
      
      if (!callResult.success) {
        throw new Error(`Call endpoint failed: ${callResult.message}`);
      }

      // Step 3: Validate OpenAI API key
      const openaiResult = await axios.get('https://api.openai.com/v1/models', {
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
        }
      });
      
      if (openaiResult.status !== 200) {
        throw new Error('OpenAI API key validation failed');
      }
      console.log('✅ OpenAI API key validated');
      
      // Note: OpenAI Realtime connection will be established by backend when call starts

      // Test HTTP endpoints
      const endpointResult = await this.validateEndpoints();
      if (!endpointResult.success) {
        throw new Error(`Endpoint validation failed: ${endpointResult.message}`);
      }

      // Print test summary
      const endTime = performance.now();
      console.log('\n📊 Test Summary');
      console.log('Connection Times:');
      Object.entries(this.metrics.connectionTimes).forEach(([endpoint, time]) => {
        console.log(`  ${endpoint}: ${time.toFixed(2)}ms`);
      });
      
      if (this.metrics.messageLatencies.length > 0) {
        const avgLatency = this.metrics.messageLatencies.reduce((a, b) => a + b, 0) / this.metrics.messageLatencies.length;
        console.log(`Message Latency (avg): ${avgLatency.toFixed(2)}ms`);
      }
      
      if (this.metrics.errors.length > 0) {
        console.log('\nErrors encountered:');
        this.metrics.errors.forEach(error => console.log(`  - ${error}`));
      }
      
      console.log(`\nTotal Test Duration: ${(endTime - startTime).toFixed(2)}ms`);
      console.log('\n✨ All validations completed successfully!');
      
    } catch (error: any) {
      console.error('\n❌ Connection sequence failed:', error.message || error);
      if (error.error) {
        console.error('Details:', error.error);
      }
      process.exit(1);
    }
  }
}

// Run test if called directly
if (require.main === module) {
  const tester = new ConnectionSequenceTester();
  tester.testSequence();
}
