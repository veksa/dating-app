import type {WebSocket as WsWebSocket} from 'ws';

export type CustomWebSocket = WsWebSocket & {
    session?: {
        sessionId: string;
        userId: string;
    };
}

export interface IClientMapItem {
    socket: CustomWebSocket;
    lastActiveTimestamp: number;
}

export interface IEventMapItem {
    key: string;
    payloadType: number;
    payload: unknown;
}
