"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var date_fns_1 = require("date-fns");
var fs = require("fs");
var path = require("path");
/**
 * Log levels with corresponding colors and symbols
 */
var LOG_LEVELS = {
    INFO: { color: '\x1b[34m', symbol: '\u2139' }, // Blue
    SUCCESS: { color: '\x1b[32m', symbol: '\u2713' }, // Green
    WARNING: { color: '\x1b[33m', symbol: '\u26a0' }, // Yellow
    ERROR: { color: '\x1b[31m', symbol: '\u2717' } // Red
};
/**
 * Logger class for consistent logging across the application
 */
var Logger = /** @class */ (function () {
    function Logger() {
        this.logFile = null;
        this.resetColor = '\x1b[0m';
        // Private constructor for singleton pattern
    }
    /**
     * Get singleton instance of Logger
     */
    Logger.getInstance = function () {
        if (!Logger.instance) {
            Logger.instance = new Logger();
        }
        return Logger.instance;
    };
    /**
     * Initialize logger with a log file
     * @param prefix - Prefix for the log file name
     */
    Logger.prototype.initLogFile = function (prefix) {
        var timestamp = (0, date_fns_1.format)(new Date(), 'yyyy-MM-dd_HH-mm-ss');
        var sanitizedPrefix = prefix.replace(/[^a-z0-9-]/gi, '_').toLowerCase();
        var filename = "".concat(sanitizedPrefix, "_").concat(timestamp, ".log");
        // Ensure logs directory exists
        var logsDir = path.join(__dirname, '../../logs');
        if (!fs.existsSync(logsDir)) {
            fs.mkdirSync(logsDir, { recursive: true });
        }
        this.logFile = path.join(logsDir, filename);
    };
    /**
     * Format a log message with timestamp, level, and color
     */
    Logger.prototype.formatMessage = function (level, message) {
        var _a = LOG_LEVELS[level], color = _a.color, symbol = _a.symbol;
        var timestamp = (0, date_fns_1.format)(new Date(), 'HH:mm:ss');
        return "".concat(color).concat(symbol, " [").concat(timestamp, "] ").concat(message).concat(this.resetColor);
    };
    /**
     * Write a message to console and log file
     */
    Logger.prototype.log = function (level, message, error) {
        var consoleMessage = this.formatMessage(level, message);
        var fileMessage = "[".concat(level, "] ").concat(message).concat(error ? "\n".concat(error.stack, "\n") : '');
        console.log(consoleMessage);
        if (this.logFile) {
            fs.appendFileSync(this.logFile, fileMessage + '\n');
        }
    };
    /**
     * Log an informational message
     */
    Logger.prototype.info = function (message) {
        this.log('INFO', message);
    };
    /**
     * Log a success message
     */
    Logger.prototype.success = function (message) {
        this.log('SUCCESS', message);
    };
    /**
     * Log a warning message
     */
    Logger.prototype.warning = function (message) {
        this.log('WARNING', message);
    };
    /**
     * Log an error message with optional Error object
     */
    Logger.prototype.error = function (message, error) {
        this.log('ERROR', message, error);
        if (error === null || error === void 0 ? void 0 : error.stack) {
            this.log('ERROR', 'Stack trace:', error);
        }
    };
    return Logger;
}());
// Create and export singleton instance
var logger = Logger.getInstance();
exports.default = logger;
