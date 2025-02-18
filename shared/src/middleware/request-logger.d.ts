import { Request, Response, NextFunction } from 'express';
export declare const createRequestLogger: (serviceName: "webapp" | "devPhone" | "websocketServer") => (req: Request, res: Response, next: NextFunction) => void;
export declare const createErrorLogger: (serviceName: "webapp" | "devPhone" | "websocketServer") => (err: Error, req: Request, res: Response, next: NextFunction) => void;
