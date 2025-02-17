import { useState, useEffect } from 'react';

export function useTwilioCredentials() {
  const [hasCredentials, setHasCredentials] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkCredentials = async () => {
      setIsLoading(true);
      try {
        const response = await fetch('/api/twilio');
        const data = await response.json();
        setHasCredentials(data.credentialsSet);
      } catch (error) {
        console.error('Error checking Twilio credentials:', error);
        setError('Failed to check Twilio credentials.');
      } finally {
        setIsLoading(false);
      }
    };

    checkCredentials();
  }, []);

  return { hasCredentials, isLoading, error };
} 