interface LoggerOptions {
  level?: string;
  prefix?: string;
}

class Logger {
  private level: string;
  private prefix: string;

  constructor(options: LoggerOptions = {}) {
    this.level = options.level || 'info';
    this.prefix = options.prefix || '';
  }

  private formatMessage(level: string, message: string, ...args: any[]): string {
    const timestamp = new Date().toISOString();
    const formattedArgs = args.map(arg => 
      typeof arg === 'object' ? JSON.stringify(arg, null, 2) : arg
    ).join(' ');
    
    return `${timestamp} ${level.toUpperCase()} ${this.prefix}${message} ${formattedArgs}`.trim();
  }

  debug(message: string, ...args: any[]): void {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(this.formatMessage('debug', message, ...args));
    }
  }

  info(message: string, ...args: any[]): void {
    console.info(this.formatMessage('info', message, ...args));
  }

  warn(message: string, ...args: any[]): void {
    console.warn(this.formatMessage('warn', message, ...args));
  }

  error(message: string, ...args: any[]): void {
    console.error(this.formatMessage('error', message, ...args));
  }
}

export const logger = new Logger({
  prefix: process.env.NODE_ENV === 'production' ? '[PROD] ' : '[DEV] '
}); 