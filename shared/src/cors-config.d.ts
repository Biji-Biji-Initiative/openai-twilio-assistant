import { CorsOptions } from 'cors';
import { IncomingMessage } from 'http';
export interface WebSocketInfo {
    origin: string;
    secure: boolean;
    req: IncomingMessage;
}
export declare const allowedOrigins: string[];
export declare const allowedMethods: string[];
export declare const allowedHeaders: string[];
export declare const exposedHeaders: string[];
export declare const corsOptions: CorsOptions;
export declare const verifyWebSocketClient: (info: WebSocketInfo) => boolean;
