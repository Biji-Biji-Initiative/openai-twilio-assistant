import { PhoneNumber } from './phone-number';

export type ChecklistState = {
  hasCredentials: boolean;
  phoneNumbers: PhoneNumber[];
  currentNumberSid: string;
  currentVoiceUrl: string;
  publicUrl: string;
  localServerUp: boolean;
  publicUrlAccessible: boolean;
  allChecksPassed: boolean;
  webhookLoading: boolean;
  ngrokLoading: boolean;
  isPolling: boolean;
};

export type ChecklistAction = 
  | { type: 'SET_CREDENTIALS', payload: boolean }
  | { type: 'SET_PHONE_NUMBERS', payload: PhoneNumber[] }
  | { type: 'SET_CURRENT_NUMBER', payload: { sid: string; voiceUrl: string; friendlyName: string } }
  | { type: 'SET_PUBLIC_URL', payload: string }
  | { type: 'SET_LOCAL_SERVER', payload: boolean }
  | { type: 'SET_PUBLIC_URL_ACCESSIBLE', payload: boolean }
  | { type: 'SET_WEBHOOK_LOADING', payload: boolean }
  | { type: 'SET_NGROK_LOADING', payload: boolean }
  | { type: 'SET_POLLING', payload: boolean }
  | { type: 'UPDATE_ALL_CHECKS' };

export type ChecklistItem = {
  label: string;
  done: boolean;
  description: string;
  field: React.ReactNode | null;
  loading?: boolean;
  error?: string;
};

export interface SetupProps {
  ready: boolean;
  setReady: (val: boolean) => void;
  selectedPhoneNumber: string;
  setSelectedPhoneNumber: (val: string) => void;
} 