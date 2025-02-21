"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var ws_1 = require("ws");
var dotenv_1 = require("dotenv");
var path_1 = require("path");
var child_process_1 = require("child_process");
var twilio_1 = require("twilio");
var axios_1 = require("axios");
var fs_1 = require("fs");
// Load both .env files
dotenv_1.default.config({ path: path_1.default.join(__dirname, '../webapp/.env') });
dotenv_1.default.config({ path: path_1.default.join(__dirname, '../websocket-server/.env') });
var ConnectionValidator = /** @class */ (function () {
    function ConnectionValidator() {
        this.wsCallConnection = null;
        this.wsLogsConnection = null;
        this.healthStatus = {
            ngrok: false,
            websocket: false,
            twilio: false,
            openai: false
        };
        this.retryConfig = {
            maxAttempts: 3,
            delayMs: 1000,
            backoffFactor: 1.5
        };
        this.twilioClient = null;
        this.lastValidationTime = 0;
        this.validationHistory = [];
    }
    ConnectionValidator.getInstance = function () {
        if (!ConnectionValidator.instance) {
            ConnectionValidator.instance = new ConnectionValidator();
        }
        return ConnectionValidator.instance;
    };
    ConnectionValidator.prototype.log = function (level, message) {
        var emoji = {
            info: 'ℹ️',
            error: '❌',
            success: '✅',
            warning: '⚠️',
            recovery: '🔄'
        };
        // Save to log file
        var logEntry = "".concat(new Date().toISOString(), " [").concat(level.toUpperCase(), "] ").concat(message, "\n");
        (0, fs_1.writeFileSync)('validation.log', logEntry, { flag: 'a' });
        console.log("".concat(emoji[level], " ").concat(message));
    };
    ConnectionValidator.prototype.retryOperation = function (operation, name) {
        return __awaiter(this, void 0, void 0, function () {
            var lastError, attempt, delay, error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        attempt = 1;
                        delay = this.retryConfig.delayMs;
                        _a.label = 1;
                    case 1:
                        if (!(attempt <= this.retryConfig.maxAttempts)) return [3 /*break*/, 7];
                        _a.label = 2;
                    case 2:
                        _a.trys.push([2, 4, , 6]);
                        return [4 /*yield*/, operation()];
                    case 3: return [2 /*return*/, _a.sent()];
                    case 4:
                        error_1 = _a.sent();
                        lastError = error_1;
                        this.log('warning', "Attempt ".concat(attempt, " failed for ").concat(name, ". Retrying in ").concat(delay, "ms..."));
                        return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, delay); })];
                    case 5:
                        _a.sent();
                        delay *= this.retryConfig.backoffFactor;
                        attempt++;
                        return [3 /*break*/, 6];
                    case 6: return [3 /*break*/, 1];
                    case 7: throw new Error("All ".concat(this.retryConfig.maxAttempts, " attempts failed for ").concat(name, ". Last error: ").concat(lastError));
                }
            });
        });
    };
    ConnectionValidator.prototype.validateNgrok = function () {
        return __awaiter(this, void 0, void 0, function () {
            var ngrokDomain, ngrokPs, _a, response, error_2;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 7, , 8]);
                        ngrokDomain = process.env.NGROK_DOMAIN || 'mereka.ngrok.io';
                        _b.label = 1;
                    case 1:
                        _b.trys.push([1, 4, , 5]);
                        ngrokPs = (0, child_process_1.execSync)('ps aux | grep ngrok').toString();
                        if (!!ngrokPs.includes(ngrokDomain)) return [3 /*break*/, 3];
                        this.log('recovery', 'Ngrok not running with correct domain, restarting...');
                        (0, child_process_1.execSync)('pkill ngrok');
                        (0, child_process_1.spawn)('ngrok', ['http', '3000', '--subdomain=' + ngrokDomain.split('.')[0]], {
                            detached: true,
                            stdio: 'ignore'
                        });
                        // Wait for ngrok to start
                        return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, 5000); })];
                    case 2:
                        // Wait for ngrok to start
                        _b.sent();
                        _b.label = 3;
                    case 3: return [3 /*break*/, 5];
                    case 4:
                        _a = _b.sent();
                        return [2 /*return*/, {
                                success: false,
                                message: 'Ngrok is not running. Please start ngrok first.'
                            }];
                    case 5: return [4 /*yield*/, fetch("https://".concat(ngrokDomain, "/health"))];
                    case 6:
                        response = _b.sent();
                        if (!response.ok) {
                            return [2 /*return*/, {
                                    success: false,
                                    message: "Ngrok domain ".concat(ngrokDomain, " is not accessible")
                                }];
                        }
                        return [2 /*return*/, {
                                success: true,
                                message: "Ngrok is running and accessible at ".concat(ngrokDomain)
                            }];
                    case 7:
                        error_2 = _b.sent();
                        return [2 /*return*/, {
                                success: false,
                                message: 'Failed to validate Ngrok',
                                error: error_2
                            }];
                    case 8: return [2 /*return*/];
                }
            });
        });
    };
    ConnectionValidator.prototype.validateTwilio = function () {
        return __awaiter(this, void 0, void 0, function () {
            var client, account, numbers, inboundNumber_1, outboundNumber_1, hasInboundNumber, hasOutboundNumber, error_3;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 3, , 4]);
                        client = new twilio_1.Twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
                        this.twilioClient = client;
                        return [4 /*yield*/, client.api.accounts(process.env.TWILIO_ACCOUNT_SID).fetch()];
                    case 1:
                        account = _a.sent();
                        if (account.status !== 'active') {
                            return [2 /*return*/, {
                                    success: false,
                                    message: 'Twilio account is not active'
                                }];
                        }
                        return [4 /*yield*/, client.incomingPhoneNumbers.list()];
                    case 2:
                        numbers = _a.sent();
                        inboundNumber_1 = process.env.TWILIO_INBOUND_NUMBER;
                        outboundNumber_1 = process.env.TWILIO_OUTBOUND_NUMBER;
                        if (!inboundNumber_1 || !outboundNumber_1) {
                            return [2 /*return*/, {
                                    success: false,
                                    message: 'Missing required phone numbers in environment variables'
                                }];
                        }
                        hasInboundNumber = numbers.some(function (n) {
                            return n.phoneNumber === inboundNumber_1 || n.phoneNumber === '+' + inboundNumber_1;
                        });
                        hasOutboundNumber = numbers.some(function (n) {
                            return n.phoneNumber === outboundNumber_1 || n.phoneNumber === '+' + outboundNumber_1;
                        });
                        if (!hasInboundNumber || !hasOutboundNumber) {
                            return [2 /*return*/, {
                                    success: false,
                                    message: "Phone numbers not found in Twilio account. Inbound: ".concat(hasInboundNumber, ", Outbound: ").concat(hasOutboundNumber)
                                }];
                        }
                        return [2 /*return*/, {
                                success: true,
                                message: 'Twilio validation successful'
                            }];
                    case 3:
                        error_3 = _a.sent();
                        return [2 /*return*/, {
                                success: false,
                                message: 'Twilio validation failed',
                                error: error_3
                            }];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    ConnectionValidator.prototype.validateOpenAI = function () {
        return __awaiter(this, void 0, void 0, function () {
            var response, error_4;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, axios_1.default.get('https://api.openai.com/v1/models', {
                                headers: {
                                    'Authorization': "Bearer ".concat(process.env.OPENAI_API_KEY)
                                }
                            })];
                    case 1:
                        response = _a.sent();
                        if (response.status !== 200) {
                            return [2 /*return*/, {
                                    success: false,
                                    message: 'OpenAI API key is invalid'
                                }];
                        }
                        return [2 /*return*/, {
                                success: true,
                                message: 'OpenAI validation successful'
                            }];
                    case 2:
                        error_4 = _a.sent();
                        return [2 /*return*/, {
                                success: false,
                                message: 'OpenAI validation failed',
                                error: error_4
                            }];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    ConnectionValidator.prototype.createWebSocketConnection = function (path) {
        var _this = this;
        return new Promise(function (resolve) {
            var ngrokDomain = process.env.NGROK_DOMAIN || 'mereka.ngrok.io';
            var ws = new ws_1.default("wss://".concat(ngrokDomain, "/").concat(path));
            var timeoutId = setTimeout(function () {
                ws.terminate(); // Force close the connection
                resolve({
                    success: false,
                    message: "Connection timeout for ".concat(path)
                });
            }, 5000);
            ws.on('open', function () {
                clearTimeout(timeoutId);
                if (path === 'call') {
                    if (_this.wsCallConnection) {
                        _this.wsCallConnection.terminate();
                    }
                    _this.wsCallConnection = ws;
                }
                else {
                    if (_this.wsLogsConnection) {
                        _this.wsLogsConnection.terminate();
                    }
                    _this.wsLogsConnection = ws;
                }
                resolve({
                    success: true,
                    message: "Successfully connected to ".concat(path, " endpoint")
                });
            });
            ws.on('error', function (error) {
                clearTimeout(timeoutId);
                ws.terminate(); // Force close on error
                resolve({
                    success: false,
                    message: "Failed to connect to ".concat(path, " endpoint"),
                    error: error
                });
            });
            // Add close handler to clean up
            ws.on('close', function () {
                clearTimeout(timeoutId);
                if (path === 'call' && _this.wsCallConnection === ws) {
                    _this.wsCallConnection = null;
                }
                else if (path === 'logs' && _this.wsLogsConnection === ws) {
                    _this.wsLogsConnection = null;
                }
            });
        });
    };
    ConnectionValidator.prototype.cleanup = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (this.wsCallConnection) {
                            this.wsCallConnection.terminate();
                            this.wsCallConnection = null;
                        }
                        if (this.wsLogsConnection) {
                            this.wsLogsConnection.terminate();
                            this.wsLogsConnection = null;
                        }
                        // Wait for connections to fully close
                        return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, 1000); })];
                    case 1:
                        // Wait for connections to fully close
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    ConnectionValidator.prototype.checkHealth = function () {
        return __awaiter(this, void 0, void 0, function () {
            var health, error_5;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, axios_1.default.get("https://".concat(process.env.NGROK_DOMAIN, "/health"))];
                    case 1:
                        health = _a.sent();
                        this.healthStatus = health.data;
                        this.log('info', "Health status: ".concat(JSON.stringify(this.healthStatus)));
                        return [3 /*break*/, 3];
                    case 2:
                        error_5 = _a.sent();
                        this.log('error', 'Health check failed');
                        return [3 /*break*/, 3];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    ConnectionValidator.prototype.attemptRecovery = function (service) {
        return __awaiter(this, void 0, void 0, function () {
            var _a, _b, callResult, logsResult, _c;
            var _d;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        this.log('recovery', "Attempting to recover ".concat(service, "..."));
                        _a = service;
                        switch (_a) {
                            case 'ngrok': return [3 /*break*/, 1];
                            case 'websocket': return [3 /*break*/, 4];
                        }
                        return [3 /*break*/, 9];
                    case 1:
                        _e.trys.push([1, 3, , 4]);
                        (0, child_process_1.execSync)('pkill ngrok');
                        (0, child_process_1.spawn)('ngrok', ['http', '3000', '--subdomain=' + ((_d = process.env.NGROK_DOMAIN) === null || _d === void 0 ? void 0 : _d.split('.')[0])], {
                            detached: true,
                            stdio: 'ignore'
                        });
                        return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, 5000); })];
                    case 2:
                        _e.sent();
                        return [2 /*return*/, true];
                    case 3:
                        _b = _e.sent();
                        return [2 /*return*/, false];
                    case 4:
                        _e.trys.push([4, 8, , 9]);
                        return [4 /*yield*/, this.cleanup()];
                    case 5:
                        _e.sent();
                        return [4 /*yield*/, this.createWebSocketConnection('call')];
                    case 6:
                        callResult = _e.sent();
                        return [4 /*yield*/, this.createWebSocketConnection('logs')];
                    case 7:
                        logsResult = _e.sent();
                        return [2 /*return*/, callResult.success && logsResult.success];
                    case 8:
                        _c = _e.sent();
                        return [2 /*return*/, false];
                    case 9: return [2 /*return*/, false];
                }
            });
        });
    };
    ConnectionValidator.prototype.validateAll = function () {
        return __awaiter(this, void 0, void 0, function () {
            var requiredVars, missingVars, services, _i, services_1, service, result, recovered, error_6, callResult, logsResult, validationResult, error_7;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 18, , 20]);
                        // 1. Check environment variables
                        this.log('info', 'Validating environment variables...');
                        requiredVars = [
                            'TWILIO_ACCOUNT_SID',
                            'TWILIO_AUTH_TOKEN',
                            'TWILIO_INBOUND_NUMBER',
                            'TWILIO_OUTBOUND_NUMBER',
                            'OPENAI_API_KEY',
                            'NGROK_DOMAIN',
                            'NGROK_AUTH_TOKEN'
                        ];
                        missingVars = requiredVars.filter(function (v) { return !process.env[v]; });
                        if (missingVars.length > 0) {
                            this.log('error', "Missing required environment variables: ".concat(missingVars.join(', ')));
                            return [2 /*return*/];
                        }
                        this.log('success', 'Environment variables validated');
                        services = [
                            { name: 'Ngrok', fn: function () { return _this.validateNgrok(); } },
                            { name: 'Twilio', fn: function () { return _this.validateTwilio(); } },
                            { name: 'OpenAI', fn: function () { return _this.validateOpenAI(); } }
                        ];
                        _i = 0, services_1 = services;
                        _a.label = 1;
                    case 1:
                        if (!(_i < services_1.length)) return [3 /*break*/, 10];
                        service = services_1[_i];
                        this.log('info', "Validating ".concat(service.name, "..."));
                        _a.label = 2;
                    case 2:
                        _a.trys.push([2, 7, , 9]);
                        return [4 /*yield*/, this.retryOperation(service.fn, service.name)];
                    case 3:
                        result = _a.sent();
                        if (!!result.success) return [3 /*break*/, 5];
                        this.log('error', result.message);
                        return [4 /*yield*/, this.attemptRecovery(service.name.toLowerCase())];
                    case 4:
                        recovered = _a.sent();
                        if (!recovered) {
                            this.log('error', "Failed to recover ".concat(service.name));
                            return [2 /*return*/];
                        }
                        this.log('success', "Recovered ".concat(service.name, " successfully"));
                        return [3 /*break*/, 6];
                    case 5:
                        this.log('success', result.message);
                        _a.label = 6;
                    case 6: return [3 /*break*/, 9];
                    case 7:
                        error_6 = _a.sent();
                        this.log('error', "".concat(service.name, " validation failed after retries"));
                        return [4 /*yield*/, this.cleanup()];
                    case 8:
                        _a.sent();
                        process.exit(1);
                        return [2 /*return*/];
                    case 9:
                        _i++;
                        return [3 /*break*/, 1];
                    case 10:
                        // 3. Test WebSocket connections with health check
                        this.log('info', 'Testing WebSocket connections...');
                        return [4 /*yield*/, this.checkHealth()];
                    case 11:
                        _a.sent();
                        return [4 /*yield*/, this.createWebSocketConnection('call')];
                    case 12:
                        callResult = _a.sent();
                        if (!callResult.success) {
                            this.log('error', callResult.message);
                            return [2 /*return*/];
                        }
                        this.log('success', callResult.message);
                        return [4 /*yield*/, this.createWebSocketConnection('logs')];
                    case 13:
                        logsResult = _a.sent();
                        if (!!logsResult.success) return [3 /*break*/, 15];
                        this.log('error', logsResult.message);
                        return [4 /*yield*/, this.cleanup()];
                    case 14:
                        _a.sent();
                        process.exit(1);
                        return [2 /*return*/];
                    case 15:
                        this.log('success', 'All validations passed');
                        return [4 /*yield*/, this.cleanup()];
                    case 16:
                        _a.sent();
                        process.exit(0);
                        this.log('success', logsResult.message);
                        validationResult = {
                            timestamp: new Date().toISOString(),
                            health: this.healthStatus,
                            success: true
                        };
                        this.validationHistory.push(__assign(__assign({}, validationResult), { message: 'Validation completed successfully' }));
                        (0, fs_1.writeFileSync)('validation-history.json', JSON.stringify(this.validationHistory, null, 2));
                        // 5. Cleanup connections
                        return [4 /*yield*/, this.cleanup()];
                    case 17:
                        // 5. Cleanup connections
                        _a.sent();
                        this.log('success', 'All validations completed successfully');
                        // 6. Schedule next validation
                        setTimeout(function () { return _this.validateAll(); }, 5 * 60 * 1000); // Check every 5 minutes
                        return [3 /*break*/, 20];
                    case 18:
                        error_7 = _a.sent();
                        this.log('error', 'Validation failed with error:');
                        console.error(error_7);
                        return [4 /*yield*/, this.cleanup()];
                    case 19:
                        _a.sent();
                        return [3 /*break*/, 20];
                    case 20: return [2 /*return*/];
                }
            });
        });
    };
    return ConnectionValidator;
}());
// Handle SIGINT (Ctrl+C)
process.on('SIGINT', function () {
    console.log('\nReceived SIGINT. Cleaning up...');
    process.exit(0);
});
// Run validation
if (require.main === module) {
    var validator = ConnectionValidator.getInstance();
    validator.validateAll()
        .catch(function (error) {
        console.error('Validation failed:', error);
        process.exit(1);
    });
    // Force exit after timeout
    setTimeout(function () {
        console.error('Validation timed out');
        process.exit(1);
    }, 30000); // 30 second timeout
}
exports.default = ConnectionValidator;
