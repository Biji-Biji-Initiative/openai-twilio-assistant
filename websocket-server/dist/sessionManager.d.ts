import { WebSocket } from "ws";
interface Session {
    twilioConn?: WebSocket;
    frontendConn?: WebSocket;
    modelConn?: WebSocket;
    streamSid?: string;
    saved_config?: any;
    lastAssistantItem?: string;
    responseStartTimestamp?: number;
    latestMediaTimestamp?: number;
    openAIApiKey?: string;
}
declare let session: Session;
export declare function handleCallConnection(ws: WebSocket, openAIApiKey: string): void;
export declare function handleFrontendConnection(ws: WebSocket): void;
export default session;
