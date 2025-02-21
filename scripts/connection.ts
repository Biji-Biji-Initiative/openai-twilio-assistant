import WebSocket from 'ws';
import dotenv from 'dotenv';
import path from 'path';
import { promisify } from 'util';
import { execSync, spawn } from 'child_process';
import twilio, { Twilio } from 'twilio';
import axios from 'axios';
import { writeFileSync, readFileSync } from 'fs';
import logger from './utils/logger';

// Load both .env files
dotenv.config({ path: path.join(__dirname, '../webapp/.env') });
dotenv.config({ path: path.join(__dirname, '../websocket-server/.env') });

interface ValidationResult {
  success: boolean;
  message: string;
  error?: any;
  recoveryAttempted?: boolean;
  recoverySuccess?: boolean;
}

interface HealthCheck {
  ngrok: boolean;
  websocket: boolean;
  twilio: boolean;
  openai: boolean;
}

interface RetryConfig {
  maxAttempts: number;
  delayMs: number;
  backoffFactor: number;
}

class ConnectionValidator {
  private static instance: ConnectionValidator;
  private wsCallConnection: WebSocket | null = null;
  private wsLogsConnection: WebSocket | null = null;
  private healthStatus: HealthCheck = {
    ngrok: false,
    websocket: false,
    twilio: false,
    openai: false
  };
  private retryConfig: RetryConfig = {
    maxAttempts: 3,
    delayMs: 1000,
    backoffFactor: 1.5
  };
  private twilioClient: Twilio | null = null;
  private lastValidationTime: number = 0;
  private validationHistory: ValidationResult[] = [];

  private constructor() {}

  public static getInstance(): ConnectionValidator {
    if (!ConnectionValidator.instance) {
      ConnectionValidator.instance = new ConnectionValidator();
    }
    return ConnectionValidator.instance;
  }

  private log(level: 'info' | 'error' | 'success' | 'warning' | 'recovery', message: string) {
    const emoji = {
      info: 'ℹ️',
      error: '❌',
      success: '✅',
      warning: '⚠️',
      recovery: '🔄'
    };
    
    // Save to log file
    const logEntry = `${new Date().toISOString()} [${level.toUpperCase()}] ${message}\n`;
    writeFileSync('validation.log', logEntry, { flag: 'a' });
    console.log(`${emoji[level]} ${message}`);
  }

  private async retryOperation<T>(operation: () => Promise<T>, name: string): Promise<T> {
    let lastError: any;
    let attempt = 1;
    let delay = this.retryConfig.delayMs;

    while (attempt <= this.retryConfig.maxAttempts) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        this.log('warning', `Attempt ${attempt} failed for ${name}. Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= this.retryConfig.backoffFactor;
        attempt++;
      }
    }

    throw new Error(`All ${this.retryConfig.maxAttempts} attempts failed for ${name}. Last error: ${lastError}`);
  }

  private async validateNgrok(): Promise<ValidationResult> {
    try {
      const ngrokDomain = process.env.NGROK_DOMAIN || 'mereka.ngrok.io';
      
      // Check if ngrok is running with correct configuration
      try {
        interface NgrokTunnel {
          public_url: string;
          config: {
            addr: string;
          };
        }

        interface NgrokApiResponse {
          tunnels: NgrokTunnel[];
        }

        const response = await fetch('http://localhost:4040/api/tunnels');
        const ngrokApi = await response.json() as NgrokApiResponse;
        const tunnels = ngrokApi.tunnels || [];
        const correctTunnel = tunnels.find(t => 
          t.public_url.includes(ngrokDomain) && 
          t.config.addr === 'http://localhost:8081'
        );

        if (!correctTunnel) {
          this.log('recovery', 'Ngrok not running with correct configuration, restarting...');
          execSync('cd ../webapp && ngrok start --config ngrok.yml --all');
          // Wait for ngrok to start
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
      } catch (error) {
        return {
          success: false,
          message: 'Ngrok is not running or API is not accessible. Please start ngrok first.',
          error
        };
      }

      // Validate domain is accessible
      const wsUrl = `wss://${ngrokDomain}/logs`;
      try {
        const ws = new WebSocket(wsUrl);
        await new Promise((resolve, reject) => {
          ws.onopen = resolve;
          ws.onerror = reject;
          // Timeout after 5 seconds
          setTimeout(() => reject(new Error('WebSocket connection timeout')), 5000);
        });
        ws.close();
        this.log('success', `Successfully connected to WebSocket at ${wsUrl}`);
      } catch (error) {
        return {
          success: false,
          message: `WebSocket connection to ${wsUrl} failed`,
          error
        };
      }

      return {
        success: true,
        message: `Ngrok is running and accessible at ${ngrokDomain}`
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to validate Ngrok',
        error
      };
    }
  }

  private async validateTwilio(): Promise<ValidationResult> {
    try {
      const client = new Twilio(process.env.TWILIO_ACCOUNT_SID!, process.env.TWILIO_AUTH_TOKEN!);
      this.twilioClient = client;

      // Validate credentials
      const account = await client.api.accounts(process.env.TWILIO_ACCOUNT_SID!).fetch();
      if (account.status !== 'active') {
        return {
          success: false,
          message: 'Twilio account is not active'
        };
      }

      // Validate phone numbers
      const numbers = await client.incomingPhoneNumbers.list();
      const inboundNumber = process.env.TWILIO_INBOUND_NUMBER;
      const outboundNumber = process.env.TWILIO_OUTBOUND_NUMBER;
      
      if (!inboundNumber || !outboundNumber) {
        return {
          success: false,
          message: 'Missing required phone numbers in environment variables'
        };
      }
      
      const hasInboundNumber = numbers.some((n: { phoneNumber: string }) => 
        n.phoneNumber === inboundNumber || n.phoneNumber === '+' + inboundNumber
      );
      
      const hasOutboundNumber = numbers.some((n: { phoneNumber: string }) => 
        n.phoneNumber === outboundNumber || n.phoneNumber === '+' + outboundNumber
      );
      
      if (!hasInboundNumber || !hasOutboundNumber) {
        return {
          success: false,
          message: `Phone numbers not found in Twilio account. Inbound: ${hasInboundNumber}, Outbound: ${hasOutboundNumber}`
        };
      }

      return {
        success: true,
        message: 'Twilio validation successful'
      };
    } catch (error) {
      return {
        success: false,
        message: 'Twilio validation failed',
        error
      };
    }
  }

  private async validateOpenAI(): Promise<ValidationResult> {
    try {
      const response = await axios.get('https://api.openai.com/v1/models', {
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
        }
      });

      if (response.status !== 200) {
        return {
          success: false,
          message: 'OpenAI API key is invalid'
        };
      }

      return {
        success: true,
        message: 'OpenAI validation successful'
      };
    } catch (error) {
      return {
        success: false,
        message: 'OpenAI validation failed',
        error
      };
    }
  }

  private createWebSocketConnection(path: string): Promise<ValidationResult> {
    return new Promise((resolve) => {
      const ngrokDomain = process.env.NGROK_DOMAIN || 'mereka.ngrok.io';
      const ws = new WebSocket(`wss://${ngrokDomain}/${path}`);
      
      const timeoutId = setTimeout(() => {
        ws.terminate(); // Force close the connection
        resolve({
          success: false,
          message: `Connection timeout for ${path}`
        });
      }, 5000);

      ws.on('open', () => {
        clearTimeout(timeoutId);
        if (path === 'call') {
          if (this.wsCallConnection) {
            this.wsCallConnection.terminate();
          }
          this.wsCallConnection = ws;
        } else {
          if (this.wsLogsConnection) {
            this.wsLogsConnection.terminate();
          }
          this.wsLogsConnection = ws;
        }
        resolve({
          success: true,
          message: `Successfully connected to ${path} endpoint`
        });
      });

      ws.on('error', (error) => {
        clearTimeout(timeoutId);
        ws.terminate(); // Force close on error
        resolve({
          success: false,
          message: `Failed to connect to ${path} endpoint`,
          error
        });
      });

      // Add close handler to clean up
      ws.on('close', () => {
        clearTimeout(timeoutId);
        if (path === 'call' && this.wsCallConnection === ws) {
          this.wsCallConnection = null;
        } else if (path === 'logs' && this.wsLogsConnection === ws) {
          this.wsLogsConnection = null;
        }
      });
    });
  }

  private async cleanup() {
    if (this.wsCallConnection) {
      this.wsCallConnection.terminate();
      this.wsCallConnection = null;
    }
    if (this.wsLogsConnection) {
      this.wsLogsConnection.terminate();
      this.wsLogsConnection = null;
    }
    // Wait for connections to fully close
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  private async checkHealth(): Promise<void> {
    try {
      const health = await axios.get(`https://${process.env.NGROK_DOMAIN}/health`);
      this.healthStatus = health.data;
      this.log('info', `Health status: ${JSON.stringify(this.healthStatus)}`);
    } catch (error) {
      this.log('error', 'Health check failed');
    }
  }

  private async attemptRecovery(service: keyof HealthCheck): Promise<boolean> {
    this.log('recovery', `Attempting to recover ${service}...`);
    
    switch (service) {
      case 'ngrok':
        try {
          execSync('pkill ngrok');
          spawn('ngrok', ['http', '3000', '--subdomain=' + process.env.NGROK_DOMAIN?.split('.')[0]], {
            detached: true,
            stdio: 'ignore'
          });
          await new Promise(resolve => setTimeout(resolve, 5000));
          return true;
        } catch {
          return false;
        }
      case 'websocket':
        try {
          await this.cleanup();
          const callResult = await this.createWebSocketConnection('call');
          const logsResult = await this.createWebSocketConnection('logs');
          return callResult.success && logsResult.success;
        } catch {
          return false;
        }
      default:
        return false;
    }
  }

  public async validateAll(): Promise<void> {
    try {
      // 1. Check environment variables
      this.log('info', 'Validating environment variables...');
      const requiredVars = [
        'TWILIO_ACCOUNT_SID',
        'TWILIO_AUTH_TOKEN',
        'TWILIO_INBOUND_NUMBER',
        'TWILIO_OUTBOUND_NUMBER',
        'OPENAI_API_KEY',
        'NGROK_DOMAIN',
        'NGROK_AUTH_TOKEN'
      ];

      const missingVars = requiredVars.filter(v => !process.env[v]);
      if (missingVars.length > 0) {
        this.log('error', `Missing required environment variables: ${missingVars.join(', ')}`);
        return;
      }
      this.log('success', 'Environment variables validated');

      // 2. Validate all services with retry
      const services = [
        { name: 'Ngrok', fn: () => this.validateNgrok() },
        { name: 'Twilio', fn: () => this.validateTwilio() },
        { name: 'OpenAI', fn: () => this.validateOpenAI() }
      ];

      for (const service of services) {
        this.log('info', `Validating ${service.name}...`);
        try {
          const result = await this.retryOperation(service.fn, service.name);
          if (!result.success) {
            this.log('error', result.message);
            const recovered = await this.attemptRecovery(service.name.toLowerCase() as keyof HealthCheck);
            if (!recovered) {
              this.log('error', `Failed to recover ${service.name}`);
              return;
            }
            this.log('success', `Recovered ${service.name} successfully`);
          } else {
            this.log('success', result.message);
          }
        } catch (error) {
          this.log('error', `${service.name} validation failed after retries`);
          await this.cleanup();
          process.exit(1);
          return;
        }
      }

      // 3. Test WebSocket connections with health check
      this.log('info', 'Testing WebSocket connections...');
      await this.checkHealth();
      
      // Test call endpoint
      const callResult = await this.createWebSocketConnection('call');
      if (!callResult.success) {
        this.log('error', callResult.message);
        return;
      }
      this.log('success', callResult.message);

      // Test logs endpoint
      const logsResult = await this.createWebSocketConnection('logs');
      if (!logsResult.success) {
        this.log('error', logsResult.message);
        await this.cleanup();
        process.exit(1);
        return;
      }
      
      this.log('success', 'All validations passed');
      await this.cleanup();
      process.exit(0);
      this.log('success', logsResult.message);

      // 4. Save validation results
      const validationResult = {
        timestamp: new Date().toISOString(),
        health: this.healthStatus,
        success: true
      };
      this.validationHistory.push({
        ...validationResult,
        message: 'Validation completed successfully'
      });
      writeFileSync('validation-history.json', 
        JSON.stringify(this.validationHistory, null, 2));

      // 5. Cleanup connections
      await this.cleanup();
      this.log('success', 'All validations completed successfully');
      
      // 6. Schedule next validation
      setTimeout(() => this.validateAll(), 5 * 60 * 1000); // Check every 5 minutes

    } catch (error) {
      this.log('error', 'Validation failed with error:');
      console.error(error);
      await this.cleanup();
    }
  }
}

// Handle SIGINT (Ctrl+C)
process.on('SIGINT', () => {
  console.log('\nReceived SIGINT. Cleaning up...');
  process.exit(0);
});

// Run validation
if (require.main === module) {
  const validator = ConnectionValidator.getInstance();
  validator.validateAll()
    .catch(error => {
      console.error('Validation failed:', error);
      process.exit(1);
    });
    
  // Force exit after timeout
  setTimeout(() => {
    console.error('Validation timed out');
    process.exit(1);
  }, 30000); // 30 second timeout
}

export default ConnectionValidator;
