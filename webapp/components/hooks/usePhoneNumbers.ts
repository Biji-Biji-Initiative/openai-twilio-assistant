import { useState, useEffect } from 'react';
import type { PhoneNumber } from '../types';

export function usePhoneNumbers() {
  const [phoneNumbers, setPhoneNumbers] = useState<PhoneNumber[]>([]);
  const [selectedNumber, setSelectedNumber] = useState<PhoneNumber | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPhoneNumbers = async () => {
      setIsLoading(true);
      try {
        const response = await fetch('/api/twilio/numbers');
        const data = await response.json();
        setPhoneNumbers(data.numbers || []);
        if (data.numbers?.length > 0) {
          setSelectedNumber(data.numbers[0]);
        }
      } catch (error) {
        console.error('Error fetching phone numbers:', error);
        setError('Failed to fetch phone numbers.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPhoneNumbers();
  }, []);

  const handleNumberChange = (phoneNumber: PhoneNumber) => {
    setSelectedNumber(phoneNumber);
  };

  return { phoneNumbers, selectedNumber, isLoading, error, handleNumberChange };
} 