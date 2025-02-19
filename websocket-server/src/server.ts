import express, { Application } from "express";
import { createServer, Server } from "http";
import WebSocket from "ws";
import cors from "cors";
import { log, wsLogger, ShutdownHandler, createShutdownResource, middleware } from "@twilio/shared";
import { isOriginAllowed } from "./utils";
import { WebSocketEventHandler } from './handlers/event-handler';
import { env } from './config/environment';
import { sessionService } from './services/session-service';
import apiRouter from './routes/api';

// CORS configuration
const corsOptions = {
  origin: function (origin: string | undefined, callback: (error: Error | null, allow?: boolean) => void) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) {
      log.info('Allowing request with no origin', { type: 'cors' });
      callback(null, true);
      return;
    }

    // In development, be more permissive with CORS
    if (env.NODE_ENV === 'development') {
      log.info('Development mode - allowing origin', { type: 'cors', origin });
      callback(null, true);
      return;
    }

    if (isOriginAllowed(origin)) {
      log.info('Allowing origin', { type: 'cors', origin });
      callback(null, true);
    } else {
      log.warn('Rejected origin', { type: 'cors', origin });
      callback(new Error('CORS not allowed'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Cache-Control', 'Pragma', 'Accept', 'Origin'],
  exposedHeaders: ['Content-Length', 'Content-Type']
};

// WebSocket verification
function verifyWebSocketClient(info: { origin: string; secure: boolean; req: any }) {
  const origin = info.origin;
  if (env.NODE_ENV === 'development') {
    log.info('Development mode - allowing origin', { type: 'websocket', origin });
    return true;
  }
  
  if (isOriginAllowed(origin)) {
    log.info('Allowing origin', { type: 'websocket', origin });
    return true;
  }
  
  log.warn('Rejected origin', { type: 'websocket', origin });
  return false;
}

export async function startServer(): Promise<Server> {
  const app: Application = express();
  
  // Trust proxy for requests behind ngrok
  app.set('trust proxy', 1);
  
  const server = createServer(app);
  const wss = new WebSocket.Server({ server, verifyClient: verifyWebSocketClient });

  // Initialize shutdown handler
  const shutdownHandler = ShutdownHandler.init({
    timeout: 10000,
    beforeShutdown: async () => {
      log.info('Starting server shutdown');
      // Close all WebSocket connections gracefully
      await sessionService.closeAllSessions();
    }
  });

  // Register server for shutdown
  shutdownHandler.registerResource(
    'http-server',
    createShutdownResource('http-server', () => {
      return new Promise((resolve, reject) => {
        server.close((err) => {
          if (err) {
            log.error('Error closing HTTP server', err);
            reject(err);
          } else {
            log.info('HTTP server closed successfully');
            resolve();
          }
        });
      });
    })
  );

  // Register WebSocket server for shutdown
  shutdownHandler.registerResource(
    'websocket-server',
    createShutdownResource('websocket-server', () => {
      return new Promise((resolve) => {
        wss.close(() => {
          log.info('WebSocket server closed successfully');
          resolve();
        });
      });
    })
  );

  // Middleware
  app.use(cors(corsOptions));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(middleware.requestLogger());

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
  wss.on('connection', (ws: WebSocket, req: any) => {
    const sessionId = sessionService.createSession(ws);
    const handler = new WebSocketEventHandler(ws);
    const logger = wsLogger(sessionId);
    
    logger.info('Client connected', {
      ip: req.socket.remoteAddress,
      origin: req.headers.origin
    });
    
    ws.on('message', async (message: string) => {
      try {
        await handler.handleMessage(message);
      } catch (error) {
        logger.error('Error handling message', error instanceof Error ? error : new Error(String(error)));
      }
    });

    ws.on('error', (error: Error) => {
      logger.error('WebSocket error', error);
    });

    ws.on('close', () => {
      sessionService.removeSession(sessionId);
      logger.info('Client disconnected');
    });
  });

  // Error handling
  app.use(middleware.errorBoundary());

  // Start server
  await new Promise<void>((resolve) => {
    server.listen(env.PORT, () => {
      log.info('Server started', {
        port: env.PORT,
        publicUrl: env.PUBLIC_URL || `http://localhost:${env.PORT}`,
        environment: env.NODE_ENV
      });
      resolve();
    });
  });

  return server;
}
