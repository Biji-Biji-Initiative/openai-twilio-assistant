"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyWebSocketClient = exports.corsOptions = exports.exposedHeaders = exports.allowedHeaders = exports.allowedMethods = exports.allowedOrigins = void 0;
exports.allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:8080',
    'https://localhost:3000',
    'https://localhost:8080'
];
exports.allowedMethods = ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'];
exports.allowedHeaders = [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
    'Cache-Control',
    'Pragma'
];
exports.exposedHeaders = [
    'Content-Length',
    'Content-Type'
];
exports.corsOptions = {
    origin: (origin, callback) => {
        if (!origin || exports.allowedOrigins.includes(origin)) {
            callback(null, true);
        }
        else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: exports.allowedMethods,
    allowedHeaders: exports.allowedHeaders,
    exposedHeaders: exports.exposedHeaders
};
const verifyWebSocketClient = (info) => {
    const origin = info.origin;
    return exports.allowedOrigins.includes(origin);
};
exports.verifyWebSocketClient = verifyWebSocketClient;
