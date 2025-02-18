import express, { Application } from "express";
import { createServer } from "http";
import WebSocket from "ws";
import cors from "cors";
import { loggers } from '@twilio/shared/logger';
import { isOriginAllowed } from "./utils";
import { WebSocketEventHandler } from './handlers/event-handler';
import { env } from './config/environment';
import { errorHandler, notFoundHandler } from './middleware/error-handler';
import { sessionService } from './services/session-service';
import apiRouter from './routes/api';
import { corsOptions, verifyWebSocketClient } from '@twilio/shared/cors-config';
import { middleware } from '@twilio/shared';

export async function startServer(): Promise<ReturnType<typeof createServer>> {
  const app: Application = express();
  
  // Trust proxy - required for rate limiting behind ngrok
  app.set('trust proxy', 1);
  
  const server = createServer(app);
  const wss = new WebSocket.Server({ server });

  // Global CORS middleware configuration
  const corsOptions = {
    origin: function (origin: string | undefined, callback: (error: Error | null, allow?: boolean) => void) {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) {
        loggers.info('[CORS] Allowing request with no origin');
        callback(null, true);
        return;
      }

      // In development, be more permissive with CORS
      if (env.NODE_ENV === 'development') {
        loggers.info(`[CORS] Development mode - allowing origin: ${origin}`);
        callback(null, true);
        return;
      }

      if (isOriginAllowed(origin)) {
        loggers.info(`[CORS] Allowing origin: ${origin}`);
        callback(null, true);
      } else {
        loggers.warn(`[CORS] Rejected origin: ${origin}`);
        callback(new Error('CORS not allowed'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Cache-Control', 'Pragma', 'Accept', 'Origin'],
    exposedHeaders: ['Content-Length', 'Content-Type']
  };

  // Middleware
  app.use(cors(corsOptions));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Add CORS headers for WebSocket upgrade requests
  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Origin');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    
    if (req.method === 'OPTIONS') {
      res.sendStatus(200);
      return;
    }
    next();
  });

  // Mount API routes
  app.use('/api', apiRouter);

  // WebSocket connection handling
  wss.on('connection', (ws: WebSocket) => {
    const sessionId = sessionService.createSession(ws);
    const handler = new WebSocketEventHandler(ws);
    
    ws.on('message', async (message: string) => {
      await handler.handleMessage(message);
    });

    ws.on('error', (error: Error) => {
      loggers.error('WebSocket error:', error);
    });

    ws.on('close', () => {
      sessionService.removeSession(sessionId);
      loggers.info('Client disconnected:', { sessionId });
    });
  });

  // Error handling
  app.use('*', notFoundHandler);
  app.use(errorHandler);

  // Start server
  server.listen(env.PORT, () => {
    loggers.info(`Server is running on port ${env.PORT}`);
    loggers.info(`Public URL: ${env.PUBLIC_URL || `http://localhost:${env.PORT}`}`);
    loggers.info('WebSocket endpoints:');
    loggers.info(`- Call: ${env.PUBLIC_URL || `http://localhost:${env.PORT}`}/call`);
    loggers.info(`- Logs: ${env.PUBLIC_URL || `http://localhost:${env.PORT}`}/logs`);
  });

  return server;
}
