import { log } from './logger';

export interface ShutdownOptions {
  timeout?: number;
  signals?: NodeJS.Signals[];
  beforeShutdown?: () => Promise<void>;
  onShutdown?: () => Promise<void>;
}

export interface Closeable {
  close(): Promise<void>;
}

export class ShutdownHandler {
  private static instance: ShutdownHandler;
  private isShuttingDown = false;
  private readonly timeout: number;
  private readonly signals: NodeJS.Signals[];
  private readonly resources: Map<string, Closeable> = new Map();
  private readonly beforeShutdown?: () => Promise<void>;
  private readonly onShutdown?: () => Promise<void>;

  private constructor(options: ShutdownOptions = {}) {
    this.timeout = options.timeout || 10000;
    this.signals = options.signals || ['SIGTERM', 'SIGINT', 'SIGUSR2'];
    this.beforeShutdown = options.beforeShutdown;
    this.onShutdown = options.onShutdown;

    this.setupHandlers();
  }

  public static init(options?: ShutdownOptions): ShutdownHandler {
    if (!ShutdownHandler.instance) {
      ShutdownHandler.instance = new ShutdownHandler(options);
    }
    return ShutdownHandler.instance;
  }

  public static getInstance(): ShutdownHandler {
    if (!ShutdownHandler.instance) {
      throw new Error('ShutdownHandler not initialized. Call init() first.');
    }
    return ShutdownHandler.instance;
  }

  private setupHandlers(): void {
    this.signals.forEach(signal => {
      process.on(signal, async () => {
        await this.shutdown(signal);
      });
    });

    process.on('uncaughtException', async (error) => {
      log.error('Uncaught exception', error, { type: 'uncaughtException' });
      await this.shutdown('uncaughtException');
    });

    process.on('unhandledRejection', async (reason) => {
      log.error('Unhandled rejection', reason instanceof Error ? reason : new Error(String(reason)), {
        type: 'unhandledRejection'
      });
      await this.shutdown('unhandledRejection');
    });
  }

  public registerResource(name: string, resource: Closeable): void {
    if (this.isShuttingDown) {
      throw new Error('Cannot register resource during shutdown');
    }
    this.resources.set(name, resource);
    log.debug(`Registered resource for shutdown: ${name}`);
  }

  public deregisterResource(name: string): void {
    this.resources.delete(name);
    log.debug(`Deregistered resource: ${name}`);
  }

  private async shutdown(signal: string): Promise<void> {
    if (this.isShuttingDown) {
      log.warn('Shutdown already in progress', { signal });
      return;
    }

    this.isShuttingDown = true;
    log.info('Starting graceful shutdown', { signal });

    try {
      if (this.beforeShutdown) {
        log.debug('Running beforeShutdown hooks');
        await Promise.race([
          this.beforeShutdown(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('beforeShutdown timeout')), this.timeout)
          )
        ]);
      }

      const shutdownPromises = Array.from(this.resources.entries()).map(
        async ([name, resource]) => {
          try {
            log.debug(`Shutting down resource: ${name}`);
            await Promise.race([
              resource.close(),
              new Promise((_, reject) =>
                setTimeout(() => reject(new Error(`Resource ${name} shutdown timeout`)), this.timeout)
              )
            ]);
            log.debug(`Successfully shut down resource: ${name}`);
          } catch (error) {
            log.error(`Error shutting down resource: ${name}`, error instanceof Error ? error : new Error(String(error)));
          }
        }
      );

      await Promise.allSettled(shutdownPromises);

      if (this.onShutdown) {
        log.debug('Running onShutdown hooks');
        await Promise.race([
          this.onShutdown(),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('onShutdown timeout')), this.timeout)
          )
        ]);
      }

      log.info('Graceful shutdown completed', { signal });
      process.exit(0);
    } catch (error) {
      log.error('Error during shutdown', error instanceof Error ? error : new Error(String(error)), {
        signal
      });
      process.exit(1);
    }
  }
}

// Helper function to create a resource that can be registered with the shutdown handler
export function createShutdownResource(
  name: string,
  closeFunction: () => Promise<void>
): Closeable {
  return {
    close: async () => {
      try {
        await closeFunction();
      } catch (error) {
        log.error(`Error closing resource: ${name}`, error instanceof Error ? error : new Error(String(error)));
        throw error;
      }
    }
  };
} 