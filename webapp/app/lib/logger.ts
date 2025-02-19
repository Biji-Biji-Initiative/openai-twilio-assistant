interface LoggerOptions {
  level?: 'debug' | 'info' | 'warn' | 'error';
  timestamp?: boolean;
  service?: string;
}

class Logger {
  private level: string;
  private showTimestamp: boolean;
  private service: string;

  constructor(options: LoggerOptions = {}) {
    this.level = options.level || (process.env.NODE_ENV === 'development' ? 'debug' : 'info');
    this.showTimestamp = options.timestamp ?? true;
    this.service = options.service || 'webapp';
  }

  private formatMessage(level: string, message: string, data?: any): string {
    const timestamp = this.showTimestamp ? `[${new Date().toISOString()}] ` : '';
    const dataStr = data ? ` ${JSON.stringify(data, null, 2)}` : '';
    return `${timestamp}[${this.service}] [${level.toUpperCase()}] ${message}${dataStr}`;
  }

  debug(message: string, data?: any) {
    if (this.level === 'debug') {
      console.debug(this.formatMessage('debug', message, data));
    }
  }

  info(message: string, data?: any) {
    if (['debug', 'info'].includes(this.level)) {
      console.info(this.formatMessage('info', message, data));
    }
  }

  warn(message: string, data?: any) {
    if (['debug', 'info', 'warn'].includes(this.level)) {
      console.warn(this.formatMessage('warn', message, data));
    }
  }

  error(message: string, data?: any) {
    console.error(this.formatMessage('error', message, data));
  }
}

export const logger = new Logger({
  level: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
  timestamp: true,
  service: 'webapp'
}); 