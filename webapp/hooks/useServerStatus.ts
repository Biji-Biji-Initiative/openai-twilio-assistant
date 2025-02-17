import { useState, useEffect } from 'react';
import { logger } from '../lib/logger';

interface ServerStatus {
  publicUrl: string | null;
  localServerUp: boolean;
  publicUrlAccessible: boolean;
  isLoading: boolean;
  error: string | null;
}

export function useServerStatus(): ServerStatus {
  const [status, setStatus] = useState<ServerStatus>({
    publicUrl: null,
    localServerUp: false,
    publicUrlAccessible: false,
    isLoading: true,
    error: null
  });

  useEffect(() => {
    let mounted = true;

    const checkStatus = async () => {
      try {
        // Check local server status
        const localResponse = await fetch('/api/health');
        const localServerUp = localResponse.ok;

        // Get public URL
        const urlResponse = await fetch('/api/public-url');
        const urlData = await urlResponse.json();
        const publicUrl = urlData.url;

        if (!publicUrl) {
          throw new Error('Public URL not available');
        }

        // Check if public URL is accessible
        const publicResponse = await fetch(`${publicUrl}/health`);
        const publicUrlAccessible = publicResponse.ok;

        if (mounted) {
          setStatus({
            publicUrl,
            localServerUp,
            publicUrlAccessible,
            isLoading: false,
            error: null
          });
        }
      } catch (error) {
        logger.error('[useServerStatus] Error checking server status:', error);
        if (mounted) {
          setStatus(prev => ({
            ...prev,
            isLoading: false,
            error: error instanceof Error ? error.message : 'Failed to check server status'
          }));
        }
      }
    };

    checkStatus();

    const interval = setInterval(checkStatus, 30000); // Check every 30 seconds

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  return status;
} 