import { format } from 'date-fns';
import * as fs from 'fs';
import * as path from 'path';
import { CONFIG } from './config';

/**
 * Log levels with corresponding colors and symbols
 */
const LOG_LEVELS = {
  INFO: { color: '\x1b[34m', symbol: 'ℹ' },    // Blue
  SUCCESS: { color: '\x1b[32m', symbol: '✓' }, // Green
  WARNING: { color: '\x1b[33m', symbol: '⚠' }, // Yellow
  ERROR: { color: '\x1b[31m', symbol: '✗' }    // Red
} as const;

type LogLevel = keyof typeof LOG_LEVELS;

/**
 * Logger class for consistent logging across the application
 */
export class Logger {
  private static instance: Logger;
  private logFile: string | null = null;
  private readonly resetColor = '\x1b[0m';

  private constructor() {
    // Private constructor for singleton pattern
  }

  /**
   * Get singleton instance of Logger
   */
  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  /**
   * Initialize logger with a log file
   * @param prefix - Prefix for the log file name
   */
  public initLogFile(prefix: string): void {
    const timestamp = format(new Date(), CONFIG.logs.timestampFormat);
    const sanitizedPrefix = prefix.replace(/[^a-z0-9-]/gi, '_').toLowerCase();
    const filename = `${sanitizedPrefix}_${timestamp}.log`;
    
    // Ensure logs directory exists
    if (!fs.existsSync(CONFIG.logs.directory)) {
      fs.mkdirSync(CONFIG.logs.directory, { recursive: true });
    }
    
    this.logFile = path.join(CONFIG.logs.directory, filename);
  }

  /**
   * Format a log message with timestamp, level, and color
   */
  private formatMessage(level: LogLevel, message: string): string {
    const { color, symbol } = LOG_LEVELS[level];
    const timestamp = format(new Date(), 'HH:mm:ss');
    return `${color}${symbol} [${timestamp}] ${message}${this.resetColor}`;
  }

  /**
   * Write a message to console and log file
   */
  private log(level: LogLevel, message: string, error?: Error): void {
    const consoleMessage = this.formatMessage(level, message);
    const fileMessage = `[${level}] ${message}${error ? \\n${error.stack}\\n : ''}`;
    
    console.log(consoleMessage);
    
    if (this.logFile) {
      fs.appendFileSync(this.logFile, fileMessage + '\\n');
    }
  }

  /**
   * Log an informational message
   */
  public info(message: string): void {
    this.log('INFO', message);
  }

  /**
   * Log a success message
   */
  public success(message: string): void {
    this.log('SUCCESS', message);
  }

  /**
   * Log a warning message
   */
  public warning(message: string): void {
    this.log('WARNING', message);
  }

  /**
   * Log an error message with optional Error object
   */
  public error(message: string, error?: Error): void {
    this.log('ERROR', message, error);
    if (error?.stack) {
      this.log('ERROR', 'Stack trace:', error);
    }
  }
}

// Export singleton instance
export const logger = Logger.getInstance();
