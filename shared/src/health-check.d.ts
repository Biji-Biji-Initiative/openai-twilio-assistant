import { Request, Response } from 'express';
export interface HealthStatus {
    status: 'ok' | 'error';
    service: string;
    version: string;
    timestamp: string;
    environment: {
        mode: string;
        publicUrl: string;
    };
    dependencies: {
        twilio: {
            hasTwilioSid: boolean;
            hasTwilioToken: boolean;
            hasTwilioPhone: boolean;
        };
        openai?: {
            hasApiKey: boolean;
        };
    };
    server: {
        uptime: number;
        memoryUsage: NodeJS.MemoryUsage;
        port: number | string;
    };
}
export interface StatusResponse extends HealthStatus {
    connections?: {
        websocket: {
            active: number;
            total: number;
        };
    };
    latency?: {
        twilio?: number;
        openai?: number;
    };
}
export declare function createHealthCheck(serviceName: string, version: string, port: number | string, publicUrl: string): (req: Request, res: Response) => Promise<void>;
export declare function createStatusCheck(serviceName: string, version: string, port: number | string, publicUrl: string, getConnectionStats: () => {
    active: number;
    total: number;
}): (req: Request, res: Response) => Promise<void>;
