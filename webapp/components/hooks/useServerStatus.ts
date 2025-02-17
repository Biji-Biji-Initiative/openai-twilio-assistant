import { useState, useEffect, useCallback } from 'react';

export function useServerStatus() {
  const [localServerUp, setLocalServerUp] = useState(false);
  const [publicUrl, setPublicUrl] = useState('');
  const [publicUrlAccessible, setPublicUrlAccessible] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const checkNgrok = useCallback(async () => {
    if (!localServerUp || !publicUrl) return;

    try {
      const response = await fetch(`${publicUrl}/health`);
      const data = await response.json();
      if (data?.status === 'ok' && data?.environment?.publicUrl) {
        setPublicUrlAccessible(true);
      } else {
        setError('Invalid ngrok health check response');
      }
    } catch (err) {
      console.error('Ngrok health check error:', err);
      setError('Failed to check ngrok');
    }
  }, [localServerUp, publicUrl]);

  useEffect(() => {
    const checkServerStatus = async () => {
      setIsLoading(true);
      try {
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
        if (!backendUrl) {
          throw new Error('NEXT_PUBLIC_BACKEND_URL not set');
        }
        
        // First, try the health check
        try {
          const response = await fetch(`${backendUrl}/health`);
          const data = await response.json();
          setLocalServerUp(true);
          setPublicUrl(data?.environment?.publicUrl || backendUrl);
        } catch (healthErr) {
          console.warn('Health check failed, falling back to public-url endpoint:', healthErr);
          // If health check fails, try the public-url endpoint
          try {
            const response = await fetch(`${backendUrl}/public-url`);
            const data = await response.json();
            const foundPublicUrl = data?.publicUrl || '';
            if (foundPublicUrl) {
              setLocalServerUp(true);
              setPublicUrl(foundPublicUrl);
            } else {
              throw new Error('No public URL found in response');
            }
          } catch (pubErr) {
            throw new Error(`Failed to get public URL: ${pubErr instanceof Error ? pubErr.message : 'Unknown error'}`);
          }
        }
      } catch (err) {
        console.error('Error checking local server:', err);
        setError('Failed to check local server');
      } finally {
        setIsLoading(false);
      }
    };

    checkServerStatus();
  }, []);

  useEffect(() => {
    // Check ngrok when local server and public URL are available
    if (localServerUp && publicUrl && !publicUrlAccessible) {
      checkNgrok();
    }
  }, [localServerUp, publicUrl, publicUrlAccessible, checkNgrok]);

  return { localServerUp, publicUrl, publicUrlAccessible, isLoading, error, checkNgrok };
}