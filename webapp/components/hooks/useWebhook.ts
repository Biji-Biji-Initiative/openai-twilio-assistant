import { useState, useCallback } from 'react';
import type { PhoneNumber } from '../types';

export function useWebhook(publicUrl: string, selectedNumber: PhoneNumber | null) {
  const [isWebhookUpdated, setIsWebhookUpdated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateWebhook = useCallback(async () => {
    if (!selectedNumber || !publicUrl) return;

    setIsLoading(true);
    try {
      const appendedTwimlUrl = `${publicUrl}/twiml`;
      const response = await fetch('/api/twilio/numbers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumberSid: selectedNumber.sid,
          voiceUrl: appendedTwimlUrl,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update webhook');
      }
      setIsWebhookUpdated(true);
    } catch (err) {
      console.error('Error updating webhook:', err);
      setError('Failed to update webhook');
    } finally {
      setIsLoading(false);
    }
  }, [publicUrl, selectedNumber]);

  return { isWebhookUpdated, isLoading, error, updateWebhook };
} 