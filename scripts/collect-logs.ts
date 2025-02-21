import WebSocket from 'ws';
import dotenv from 'dotenv';
import path from 'path';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { execSync } from 'child_process';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../webapp/.env') });
dotenv.config({ path: path.join(__dirname, '../../websocket-server/.env') });

interface LogEntry {
  timestamp: string;
  level: 'info' | 'error' | 'warning' | 'debug';
  source: 'websocket' | 'twilio' | 'model' | 'system';
  message: string;
  data?: any;
}

class LogCollector {
  private wsConnection: WebSocket | null = null;
  private logs: LogEntry[] = [];
  private logDir: string;
  private currentSession: string;

  constructor() {
    this.currentSession = new Date().toISOString().replace(/[:.]/g, '-');
    this.logDir = path.join(__dirname, '../../logs', this.currentSession);
    if (!existsSync(this.logDir)) {
      mkdirSync(this.logDir, { recursive: true });
    }
  }

  private log(level: LogEntry['level'], source: LogEntry['source'], message: string, data?: any) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      source,
      message,
      data
    };
    this.logs.push(entry);

    const emoji = {
      info: 'ℹ️',
      error: '❌',
      warning: '⚠️',
      debug: '🔍'
    };
    console.log(`${emoji[level]} [${source.toUpperCase()}] ${message}`);
    if (data) {
      console.log(JSON.stringify(data, null, 2));
    }

    // Save to file immediately
    this.saveLogs();
  }

  private saveLogs() {
    const filename = path.join(this.logDir, 'collected-logs.json');
    writeFileSync(filename, JSON.stringify({
      session: this.currentSession,
      timestamp: new Date().toISOString(),
      logs: this.logs
    }, null, 2));
  }

  private async collectSystemLogs() {
    try {
      // Collect PM2 logs if available
      try {
        const pm2Logs = execSync('pm2 logs --nostream --lines 100').toString();
        this.log('info', 'system', 'Collected PM2 logs', { pm2Logs });
      } catch {
        this.log('warning', 'system', 'PM2 logs not available');
      }

      // Collect ngrok logs
      try {
        const ngrokLogs = execSync('tail -n 100 ~/.ngrok2/ngrok.log').toString();
        this.log('info', 'system', 'Collected ngrok logs', { ngrokLogs });
      } catch {
        this.log('warning', 'system', 'Ngrok logs not available');
      }

      // Collect application logs
      try {
        const appLogs = execSync('tail -n 100 ./websocket-server/logs/app.log').toString();
        this.log('info', 'system', 'Collected application logs', { appLogs });
      } catch {
        this.log('warning', 'system', 'Application logs not available');
      }
    } catch (error) {
      this.log('error', 'system', 'Failed to collect system logs', error);
    }
  }

  private async connectWebSocket(): Promise<void> {
    return new Promise((resolve, reject) => {
      const ngrokDomain = process.env.NGROK_DOMAIN || 'mereka.ngrok.io';
      this.wsConnection = new WebSocket(`wss://${ngrokDomain}/logs`);

      const timeout = setTimeout(() => {
        if (this.wsConnection) {
          this.wsConnection.close();
        }
        reject(new Error('WebSocket connection timeout'));
      }, 5000);

      this.wsConnection.on('open', () => {
        clearTimeout(timeout);
        this.log('info', 'websocket', 'Connected to logs endpoint');
        resolve();
      });

      this.wsConnection.on('message', (data: Buffer) => {
        try {
          const message = JSON.parse(data.toString());
          this.log('info', 'websocket', 'Received log message', message);
        } catch (error) {
          this.log('error', 'websocket', 'Failed to parse message', {
            raw: data.toString(),
            error
          });
        }
      });

      this.wsConnection.on('error', (error) => {
        clearTimeout(timeout);
        this.log('error', 'websocket', 'WebSocket error', error);
        reject(error);
      });

      this.wsConnection.on('close', () => {
        this.log('info', 'websocket', 'Connection closed');
        this.wsConnection = null;
      });
    });
  }

  private async cleanup() {
    if (this.wsConnection) {
      this.wsConnection.close();
      this.wsConnection = null;
    }
    this.saveLogs();
  }

  public async collectLogs(duration: number = 60000): Promise<void> {
    try {
      // 1. Collect system logs
      this.log('info', 'system', 'Starting log collection...');
      await this.collectSystemLogs();

      // 2. Connect to WebSocket for real-time logs
      this.log('info', 'websocket', 'Connecting to WebSocket...');
      await this.connectWebSocket();

      // 3. Collect logs for specified duration
      this.log('info', 'system', `Collecting logs for ${duration/1000} seconds...`);
      await new Promise(resolve => setTimeout(resolve, duration));

    } catch (error) {
      this.log('error', 'system', 'Log collection failed', error);
    } finally {
      await this.cleanup();
      console.log(`\nLogs saved to: ${this.logDir}`);
    }
  }
}

// Run collector if called directly
if (require.main === module) {
  const collector = new LogCollector();
  collector.collectLogs().catch(console.error);
}

export default LogCollector;
