import {OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit, WebSocketGateway} from "@nestjs/websockets";
import {v4} from "uuid";
import {CustomWebSocket, IClientMapItem} from "./app.interface";
import {EventService, ISocketMessage} from "./event/event.service";
import {JwtService} from "./jwt/jwt.service";
import {IncomingMessage} from "http";

const NewMessageEvent = 310;
const ConversationDeletedEvent = 311;
const NewStoryEvent = 312;
const HeartbeatEvent = 100;

@WebSocketGateway({path: '/ws', transports: ['websocket']})
export class AppGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
    private clientMap: Map<string, IClientMapItem> = new Map();

    constructor(private event: EventService, private jwt: JwtService) {
    }

    public afterInit() {
        this.planClean();
    }

    public handleConnection(client: CustomWebSocket, req: IncomingMessage): void {
        const url = new URL(req.url ?? '', 'http://localhost');
        const token = url.searchParams.get('token');

        const payload = token ? this.jwt.tryVerify(token) : null;
        if (!payload) {
            client.close(4401, 'Unauthorized');
            return;
        }

        const sessionId = v4();
        const userId = payload.userId;

        client.session = {sessionId, userId};
        this.clientMap.set(sessionId, {socket: client, lastActiveTimestamp: Date.now()});

        this.event.setUser(sessionId, userId);
        this.event.setEvents(sessionId, [
            {key: `${userId}-${NewMessageEvent}-{}`, payloadType: NewMessageEvent, payload: {}},
            {key: `${userId}-${ConversationDeletedEvent}-{}`, payloadType: ConversationDeletedEvent, payload: {}},
            {key: `${NewStoryEvent}-{}`, payloadType: NewStoryEvent, payload: {}},
        ]);
        this.event.subscribe(sessionId, (message: ISocketMessage) => {
            if (client.readyState === client.OPEN) {
                client.send(JSON.stringify(message));
            }
        });

        console.log(`WS connected session=${sessionId} user=${userId}, total=${this.clientMap.size}`);

        client.on('message', (raw: Buffer | string) => {
            try {
                const data = JSON.parse(raw.toString()) as ISocketMessage;
                if (data.payloadType === HeartbeatEvent) {
                    const instance = this.clientMap.get(sessionId);
                    if (instance) instance.lastActiveTimestamp = Date.now();
                    if (client.readyState === client.OPEN) {
                        client.send(JSON.stringify({
                            payloadType: HeartbeatEvent,
                            payload: {},
                            clientMsgId: data.clientMsgId
                        }));
                    }
                }
            } catch {
                // ignore malformed messages
            }
        });
    }

    public handleDisconnect(client: CustomWebSocket): void {
        if (client.session?.sessionId) {
            this.clientMap.delete(client.session.sessionId);
            this.event.unsubscribe(client.session.sessionId);
            console.log(`WS disconnected session=${client.session.sessionId}, total=${this.clientMap.size}`);
        }
    }

    private planClean = () => {
        try {
            const cutoff = Date.now() - 2 * 60 * 1000;
            const stale = [...this.clientMap.values()].filter(item => item.lastActiveTimestamp <= cutoff);
            for (const item of stale) {
                try {
                    item.socket.close();
                } catch { /* already closed */
                }
            }
            if (stale.length) console.log(`[WS] planClean: closed ${stale.length} stale connection(s)`);
        } catch {
            // ignore
        }
        setTimeout(this.planClean, 30_000);
    };
}
