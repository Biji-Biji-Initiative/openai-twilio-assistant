import winston from 'winston';
import { WebSocket } from 'ws';
export declare const setFrontendConnection: (conn: WebSocket | null) => void;
declare const logger: winston.Logger;
export declare const info: (message: string, meta?: object) => void;
export declare const error: (message: string, meta?: object) => void;
export declare const warn: (message: string, meta?: object) => void;
export declare const debug: (message: string, meta?: object) => void;
export default logger;
