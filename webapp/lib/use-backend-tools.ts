import { useState, useEffect } from "react";

interface BackendTool {
  name: string;
  description: string;
  parameters: Record<string, any>;
}

// Custom hook to fetch backend tools repeatedly
export function useBackendTools(url: string, pollInterval: number = 3000): BackendTool[] {
  const [tools, setTools] = useState<BackendTool[]>([]);

  useEffect(() => {
    let mounted = true;
    let timeoutId: NodeJS.Timeout;

    const fetchTools = async () => {
      try {
        // Ensure URL is properly formed
        const apiUrl = url.startsWith('http') ? url : `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/tools`;
        const response = await fetch(apiUrl, {
          method: 'GET',
          headers: {
            'Cache-Control': 'no-cache',
            'Accept': 'application/json'
          }
        });

        if (!response.ok) {
          console.warn('[useBackendTools] Failed to fetch tools:', response.statusText);
          return;
        }

        const data = await response.json();
        if (mounted) {
          setTools(data);
        }
      } catch (error) {
        console.error('[useBackendTools] Error fetching tools:', error);
      } finally {
        if (mounted) {
          timeoutId = setTimeout(fetchTools, pollInterval);
        }
      }
    };

    fetchTools();

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
    };
  }, [url, pollInterval]);

  return tools;
}
