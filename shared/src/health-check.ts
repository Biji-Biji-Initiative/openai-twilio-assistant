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

export function createHealthCheck(
  serviceName: string,
  version: string,
  port: number | string,
  publicUrl: string
) {
  return async (req: Request, res: Response) => {
    try {
      // Set appropriate headers
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.setHeader('Content-Type', 'application/json');

      const status: HealthStatus = {
        status: 'ok',
        service: serviceName,
        version,
        timestamp: new Date().toISOString(),
        environment: {
          mode: process.env.NODE_ENV || 'development',
          publicUrl
        },
        dependencies: {
          twilio: {
            hasTwilioSid: !!process.env.TWILIO_ACCOUNT_SID,
            hasTwilioToken: !!process.env.TWILIO_AUTH_TOKEN,
            hasTwilioPhone: !!process.env.TWILIO_PHONE_NUMBER
          },
          openai: {
            hasApiKey: !!process.env.OPENAI_API_KEY
          }
        },
        server: {
          uptime: process.uptime(),
          memoryUsage: process.memoryUsage(),
          port
        }
      };

      res.status(200).json(status);
    } catch (error) {
      console.error('Health check error:', error);
      
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Content-Type', 'application/json');
      
      res.status(500).json({
        status: 'error',
        service: serviceName,
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };
}

export function createStatusCheck(
  serviceName: string,
  version: string,
  port: number | string,
  publicUrl: string,
  getConnectionStats: () => { active: number; total: number }
) {
  return async (req: Request, res: Response) => {
    try {
      const healthStatus = await new Promise<HealthStatus>((resolve) => {
        createHealthCheck(serviceName, version, port, publicUrl)(req, res as any);
        resolve(res as any);
      });

      const status: StatusResponse = {
        ...healthStatus,
        connections: {
          websocket: getConnectionStats()
        },
        latency: {
          // Add latency checks if needed
        }
      };

      res.status(200).json(status);
    } catch (error) {
      console.error('Status check error:', error);
      
      res.status(500).json({
        status: 'error',
        service: serviceName,
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };
} 