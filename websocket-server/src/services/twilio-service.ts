import twilio, { Twilio } from 'twilio';
import { env } from '../config/environment';
import { logger } from '../utils/logger';

class TwilioService {
  private client: Twilio;

  constructor() {
    this.client = twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);
  }

  async verifyCredentials(): Promise<boolean> {
    try {
      await this.client.api.accounts(env.TWILIO_ACCOUNT_SID).fetch();
      return true;
    } catch (error) {
      logger.error('Failed to verify Twilio credentials:', error);
      return false;
    }
  }

  async getPhoneNumbers() {
    try {
      const numbers = await this.client.incomingPhoneNumbers.list();
      return numbers.map(number => ({
        sid: number.sid,
        phoneNumber: number.phoneNumber,
        friendlyName: number.friendlyName,
        voiceUrl: number.voiceUrl
      }));
    } catch (error) {
      logger.error('Failed to fetch phone numbers:', error);
      throw error;
    }
  }

  async makeOutboundCall(to: string) {
    try {
      const call = await this.client.calls.create({
        to,
        from: env.TWILIO_PHONE_NUMBER,
        url: `${env.PUBLIC_URL || 'http://localhost:8081'}/twiml/outbound-call`,
      });
      
      logger.info('Outbound call initiated:', { callSid: call.sid, to });
      return call;
    } catch (error) {
      logger.error('Failed to make outbound call:', error);
      throw error;
    }
  }

  async endCall(callSid: string) {
    try {
      const call = await this.client.calls(callSid).update({ status: 'completed' });
      logger.info('Call ended:', { callSid });
      return call;
    } catch (error) {
      logger.error('Failed to end call:', error);
      throw error;
    }
  }

  async updateWebhook(phoneNumberSid: string, voiceUrl: string) {
    try {
      const number = await this.client.incomingPhoneNumbers(phoneNumberSid)
        .update({ voiceUrl });
      
      logger.info('Updated webhook URL:', { 
        phoneNumberSid, 
        voiceUrl,
        phoneNumber: number.phoneNumber 
      });
      
      return {
        sid: number.sid,
        phoneNumber: number.phoneNumber,
        friendlyName: number.friendlyName,
        voiceUrl: number.voiceUrl
      };
    } catch (error) {
      logger.error('Failed to update webhook:', error);
      throw error;
    }
  }
}

export const twilioService = new TwilioService(); 