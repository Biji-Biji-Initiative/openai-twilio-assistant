import WebSocket from 'ws';
declare let currentLogs: WebSocket | null;
declare let currentCall: WebSocket | null;
export declare function getCurrentCall(): WebSocket | null;
export declare function setupWebSocketServer(wss: WebSocket.Server, openaiApiKey: string): void;
export { currentLogs, currentCall };
