import WebSocket from 'ws';
import dotenv from 'dotenv';
import path from 'path';
import { performance } from 'perf_hooks';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../webapp/.env') });
dotenv.config({ path: path.join(__dirname, '../websocket-server/.env') });

interface MessageTest {
  name: string;
  message: any;
  expectedType?: string;
  validate?: (response: any) => boolean;
}

class APITester {
  private metrics = {
    messageLatencies: [] as number[],
    errors: [] as string[],
    responses: [] as any[]
  };

  private async testMessage(ws: WebSocket, test: MessageTest): Promise<boolean> {
    console.log(`\n🔄 Testing message: ${test.name}`);
    
    return new Promise<boolean>((resolve, reject) => {
      const start = performance.now();
      let handled = false;

      const messageHandler = (data: WebSocket.Data) => {
        if (handled) return;
        handled = true;
        
        const end = performance.now();
        const latency = end - start;
        this.metrics.messageLatencies.push(latency);
        
        try {
          const response = JSON.parse(data.toString());
          this.metrics.responses.push(response);
          
          console.log(`📥 Response received in ${latency.toFixed(2)}ms:`, response);
          
          if (test.expectedType && response.type !== test.expectedType) {
            const error = `Expected response type ${test.expectedType}, got ${response.type}`;
            this.metrics.errors.push(error);
            console.error('❌', error);
            reject(new Error(error));
            return;
          }
          
          if (test.validate && !test.validate(response)) {
            const error = 'Response validation failed';
            this.metrics.errors.push(error);
            console.error('❌', error);
            reject(new Error(error));
            return;
          }
          
          console.log('✅ Message test passed');
          resolve(true);
        } catch (error: any) {
          const errorMsg = `Failed to parse response: ${error.message}`;
          this.metrics.errors.push(errorMsg);
          console.error('❌', errorMsg);
          reject(new Error(errorMsg));
        }
      };

      const errorHandler = (error: Error) => {
        if (handled) return;
        handled = true;
        
        const errorMsg = `WebSocket error: ${error.message}`;
        this.metrics.errors.push(errorMsg);
        console.error('❌', errorMsg);
        reject(new Error(errorMsg));
      };

      // Add handlers
      ws.on('message', messageHandler);
      ws.on('error', errorHandler);

      // Send test message
      console.log('📤 Sending message:', test.message);
      ws.send(JSON.stringify(test.message));

      // Set timeout
      setTimeout(() => {
        if (!handled) {
          const error = `Timeout waiting for response to: ${test.name}`;
          this.metrics.errors.push(error);
          console.error('❌', error);
          reject(new Error(error));
        }
      }, 5000);
    }).finally(() => {
      // Clean up handlers
      ws.removeAllListeners('message');
      ws.removeAllListeners('error');
    });
  }

  public async runTests(): Promise<void> {
    console.log('\n🔍 Starting API Tests');
    
    try {
      // Connect to call endpoint
      console.log('\n1️⃣ Connecting to call endpoint...');
      const ws = new WebSocket(`wss://${process.env.NGROK_DOMAIN}/call`, {
        rejectUnauthorized: false
      });

      await new Promise<boolean>((resolve, reject) => {
        ws.on('open', () => {
          console.log('✅ Connected to call endpoint');
          resolve(true);
        });

        ws.on('error', (error) => {
          console.error('❌ WebSocket error:', error);
          reject(error);
        });

        ws.on('close', (code, reason) => {
          console.log('🔒 WebSocket closed:', code, reason.toString());
        });

        ws.on('message', (data) => {
          console.log('📥 Raw message received:', data.toString());
        });
      });

      // Define test cases
      const tests: MessageTest[] = [
        {
          name: 'Ping message',
          message: {
            type: 'ping',
            timestamp: Date.now()
          }
        },
        {
          name: 'Simple text',
          message: {
            type: 'message',
            text: 'test',
            timestamp: Date.now()
          }
        }
      ];

      // Run all tests
      for (const test of tests) {
        await this.testMessage(ws, test);
      }

      // Print summary
      console.log('\n📊 Test Summary');
      console.log('Message Latencies:');
      this.metrics.messageLatencies.forEach((latency, i) => {
        console.log(`  ${i + 1}. ${latency.toFixed(2)}ms`);
      });

      if (this.metrics.errors.length > 0) {
        console.log('\nErrors:');
        this.metrics.errors.forEach(error => console.log(`  - ${error}`));
      }

      const avgLatency = this.metrics.messageLatencies.reduce((a, b) => a + b, 0) / this.metrics.messageLatencies.length;
      console.log(`\nAverage Latency: ${avgLatency.toFixed(2)}ms`);
      
      console.log('\n✨ All API tests completed successfully!');

      // Close connection
      ws.close();
      
    } catch (error: any) {
      console.error('\n❌ API tests failed:', error.message);
      process.exit(1);
    }
  }
}

// Run tests if called directly
if (require.main === module) {
  const tester = new APITester();
  tester.runTests();
}
