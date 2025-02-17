import VoiceResponse from "twilio/lib/twiml/VoiceResponse";
interface ErrorDetails {
    message: string;
    name?: string;
    stack?: string;
    code?: string | number;
}
export declare function formatErrorDetails(error: Error | unknown): ErrorDetails;
export declare function isOriginAllowed(origin: string): boolean;
export declare function verifyWebSocketClient(info: {
    origin: string;
    secure: boolean;
    req: any;
}, callback: (verified: boolean, code?: number, message?: string) => void): void;
export declare function generateStreamingTwiML(publicUrl: string, greeting?: string): VoiceResponse;
export declare function logCallDetails(context: string, details: Record<string, any>, message: string): void;
export {};
