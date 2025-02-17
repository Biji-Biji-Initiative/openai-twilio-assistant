export type Item = {
  id: string;
  object: string; // e.g. "realtime.item"
  type: "message" | "function_call" | "function_call_output" | "call_status";
  timestamp?: string;
  status?: string;
  // For "message" items
  role?: "system" | "user" | "assistant" | "tool";
  content?: { type: string; text: string }[];
  // For "function_call" items
  name?: string;
  call_id?: string;
  params?: Record<string, any>;
  // For "function_call_output" items
  output?: string;
  // For "call_status" items
  phoneNumber?: string;
  duration?: string;
};

export interface PhoneNumber {
  sid: string;
  friendlyName: string;
  voiceUrl?: string;
}

export type FunctionCall = {
  name: string;
  params: Record<string, any>;
  completed?: boolean;
  response?: string;
  status?: string;
  call_id?: string; // ensure each call has a call_id
};
