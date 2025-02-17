import { logger } from './logger';
import { OutboundCallRequest } from './validation-schemas';
import { APIError } from '../app/api/api-helpers';

export type CallStatus = 'idle' | 'calling' | 'active' | 'ended' | 'error';

interface CallState {
  status: CallStatus;
  error: string | null;
  callSid?: string;
  phoneNumber?: string;
}

export class CallManager {
  private state: CallState;
  private stateUpdateCallback?: (state: CallState) => void;

  constructor() {
    this.state = {
      status: 'idle',
      error: null
    };
  }

  onStateUpdate(callback: (state: CallState) => void) {
    this.stateUpdateCallback = callback;
  }

  private updateState(newState: Partial<CallState>) {
    this.state = { ...this.state, ...newState };
    if (this.stateUpdateCallback) {
      this.stateUpdateCallback(this.state);
    }
  }

  async startCall(phoneNumber: string, publicUrl: string) {
    try {
      this.updateState({ status: 'calling', error: null });

      const response = await fetch('/api/outbound-call-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber,
          callType: 'stream',
          publicUrl
        } as OutboundCallRequest)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to initiate call');
      }

      logger.info('[CallManager] Call initiated:', { 
        callSid: data.data.callSid,
        status: data.data.status 
      });

      this.updateState({
        status: 'active',
        callSid: data.data.callSid,
        phoneNumber
      });

    } catch (error) {
      logger.error('[CallManager] Error starting call:', error);
      this.updateState({
        status: 'error',
        error: error instanceof Error ? error.message : 'Failed to start call'
      });
      throw error;
    }
  }

  async endCall() {
    if (!this.state.callSid) {
      logger.warn('[CallManager] Attempted to end call without callSid');
      return;
    }

    try {
      this.updateState({ status: 'ended', error: null });

      // Call your API endpoint to end the call
      const response = await fetch(`/api/calls/${this.state.callSid}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed' })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to end call');
      }

      logger.info('[CallManager] Call ended:', { 
        callSid: this.state.callSid 
      });

    } catch (error) {
      logger.error('[CallManager] Error ending call:', error);
      this.updateState({
        status: 'error',
        error: error instanceof Error ? error.message : 'Failed to end call'
      });
      throw error;
    }
  }

  getState(): CallState {
    return this.state;
  }

  reset() {
    this.updateState({
      status: 'idle',
      error: null,
      callSid: undefined,
      phoneNumber: undefined
    });
  }
} 