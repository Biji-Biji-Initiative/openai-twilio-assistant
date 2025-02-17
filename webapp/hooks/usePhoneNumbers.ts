import { useState, useEffect } from 'react';
import { logger } from '../lib/logger';
import { PhoneNumber } from '../types/phone-number';

interface PhoneNumbersState {
  phoneNumbers: PhoneNumber[];
  selectedNumber: PhoneNumber | null;
  isLoading: boolean;
  error: string | null;
  handleNumberChange: (number: PhoneNumber) => void;
}

export function usePhoneNumbers(): PhoneNumbersState {
  const [phoneNumbers, setPhoneNumbers] = useState<PhoneNumber[]>([]);
  const [selectedNumber, setSelectedNumber] = useState<PhoneNumber | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const fetchPhoneNumbers = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch('/api/phone-numbers');
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch phone numbers');
        }

        if (mounted) {
          setPhoneNumbers(data.phoneNumbers);
          // Select the first number by default if none is selected
          if (!selectedNumber && data.phoneNumbers.length > 0) {
            setSelectedNumber(data.phoneNumbers[0]);
          }
        }
      } catch (error) {
        logger.error('[usePhoneNumbers] Error fetching phone numbers:', error);
        if (mounted) {
          setError(error instanceof Error ? error.message : 'Failed to fetch phone numbers');
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    fetchPhoneNumbers();

    return () => {
      mounted = false;
    };
  }, [selectedNumber]);

  const handleNumberChange = (number: PhoneNumber) => {
    setSelectedNumber(number);
    // Store the selection in localStorage for persistence
    localStorage.setItem('selectedPhoneNumber', number.phoneNumber);
  };

  // Load selected number from localStorage on mount
  useEffect(() => {
    const savedNumber = localStorage.getItem('selectedPhoneNumber');
    if (savedNumber && phoneNumbers.length > 0) {
      const number = phoneNumbers.find(n => n.phoneNumber === savedNumber);
      if (number) {
        setSelectedNumber(number);
      }
    }
  }, [phoneNumbers]);

  return {
    phoneNumbers,
    selectedNumber,
    isLoading,
    error,
    handleNumberChange,
  };
} 