export interface PhoneNumber {
  sid: string;
  phoneNumber: string;
  friendlyName: string;
  voiceUrl?: string;
  capabilities: {
    voice: boolean;
    sms: boolean;
  };
} 