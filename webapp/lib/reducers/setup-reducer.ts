import { ChecklistState, ChecklistAction } from '@/types/setup';

export const initialState: ChecklistState = {
  hasCredentials: false,
  phoneNumbers: [],
  currentNumberSid: "",
  currentVoiceUrl: "",
  publicUrl: "",
  localServerUp: false,
  publicUrlAccessible: false,
  allChecksPassed: false,
  webhookLoading: false,
  ngrokLoading: false,
  isPolling: false,
};

export function setupReducer(state: ChecklistState, action: ChecklistAction): ChecklistState {
  switch (action.type) {
    case 'SET_CREDENTIALS':
      return { ...state, hasCredentials: action.payload };
      
    case 'SET_PHONE_NUMBERS':
      return { ...state, phoneNumbers: action.payload };
      
    case 'SET_CURRENT_NUMBER':
      return {
        ...state,
        currentNumberSid: action.payload.sid,
        currentVoiceUrl: action.payload.voiceUrl,
      };
      
    case 'SET_PUBLIC_URL':
      return { ...state, publicUrl: action.payload };
      
    case 'SET_LOCAL_SERVER':
      return { ...state, localServerUp: action.payload };
      
    case 'SET_PUBLIC_URL_ACCESSIBLE':
      return { ...state, publicUrlAccessible: action.payload };
      
    case 'SET_WEBHOOK_LOADING':
      return { ...state, webhookLoading: action.payload };
      
    case 'SET_NGROK_LOADING':
      return { ...state, ngrokLoading: action.payload };
      
    case 'SET_POLLING':
      return { ...state, isPolling: action.payload };
      
    case 'UPDATE_ALL_CHECKS':
      const webhookUrl = state.publicUrl ? `${state.publicUrl}/twiml` : "";
      const allDone = [
        state.hasCredentials,
        state.phoneNumbers.length > 0,
        state.localServerUp,
        state.publicUrlAccessible,
        !!state.publicUrl && webhookUrl === state.currentVoiceUrl
      ].every(Boolean);
      return { ...state, allChecksPassed: allDone };
      
    default:
      return state;
  }
} 