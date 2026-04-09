import {writable} from 'svelte/store';
import {v4 as uuidv4} from 'uuid';

export type WsMessage = { payloadType: number; payload: unknown; clientMsgId: string };

const WS_BASE = import.meta.env.VITE_WS_URL || 'ws://localhost:3000/ws';
const HEARTBEAT_INTERVAL = 20_000;
const HeartbeatPayloadType = 100;

export const wsConnected = writable(false);

let socket: WebSocket | null = null;
const listeners = new Map<number, ((msg: WsMessage) => void)[]>();
let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let currentToken: string | null = null;

export function onEvent(payloadType: number, handler: (msg: WsMessage) => void): () => void {
    const existing = listeners.get(payloadType) ?? [];
    listeners.set(payloadType, [...existing, handler]);
    return () => {
        const current = listeners.get(payloadType) ?? [];
        listeners.set(payloadType, current.filter(h => h !== handler));
    };
}

export function connect(token: string): Promise<void> {
    currentToken = token;
    return new Promise((resolve, reject) => {
        if (socket && socket.readyState === WebSocket.OPEN) {
            startHeartbeat();
            resolve();
            return;
        }

        if (socket && socket.readyState === WebSocket.CONNECTING) {
            resolve();
            return;
        }

        teardownSocket();

        const url = `${WS_BASE}?token=${encodeURIComponent(token)}`;
        socket = new WebSocket(url);

        socket.onopen = () => {
            wsConnected.set(true);
            startHeartbeat();
            resolve();
        };

        socket.onerror = (ev) => {
            console.warn('[WS] connection error', ev);
            reject(new Error('WebSocket connection failed'));
        };

        socket.onclose = (ev) => {
            wsConnected.set(false);
            stopHeartbeat();
            socket = null;
            if (ev.code !== 4401 && currentToken) {
                if (reconnectTimer) clearTimeout(reconnectTimer);
                reconnectTimer = setTimeout(() => connect(currentToken!).catch(() => {
                }), 3000);
            }
        };

        socket.onmessage = (event: MessageEvent) => {
            try {
                const msg = JSON.parse(event.data as string) as WsMessage;
                const handlers = listeners.get(msg.payloadType);
                if (handlers) {
                    for (const handler of handlers) handler(msg);
                }
            } catch {
                // ignore malformed
            }
        };
    });
}

export function disconnect() {
    currentToken = null;
    if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
    }
    stopHeartbeat();
    teardownSocket();
    wsConnected.set(false);
}

function teardownSocket() {
    if (!socket) return;
    socket.onclose = null;
    socket.onerror = null;
    socket.onmessage = null;
    socket.onopen = null;
    socket.close();
    socket = null;
}

function startHeartbeat() {
    stopHeartbeat();
    heartbeatTimer = setInterval(() => {
        if (socket?.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({payloadType: HeartbeatPayloadType, payload: {}, clientMsgId: uuidv4()}));
        }
    }, HEARTBEAT_INTERVAL);
}

function stopHeartbeat() {
    if (heartbeatTimer !== null) {
        clearInterval(heartbeatTimer);
        heartbeatTimer = null;
    }
}
