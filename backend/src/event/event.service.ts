import {Injectable, Logger, OnModuleDestroy, OnModuleInit} from '@nestjs/common';
import Redis from "ioredis";
import {IEventMapItem} from "../app.interface";
import {ConfigService} from "../config/config.service";

export interface ISocketMessage {
    payloadType: number;
    payload: unknown;
    clientMsgId?: string;
}

const PRIVATE_PREFIX = 'event:user:';
const PUBLIC_CHANNEL = 'event:broadcast';

const userMap = new Map<string /* sessionId */, string /* userId */>();
const eventMap = new Map<string /* sessionId */, IEventMapItem[]>();
const sendMap = new Map<string /* sessionId */, (msg: ISocketMessage) => void>();

type IPrivateEventMessage = ISocketMessage & { userId: string; clientMsgId?: string };

@Injectable()
export class EventService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(EventService.name);
    private publisher: Redis;
    private subscriber: Redis;

    constructor(private config: ConfigService) {
    }

    async onModuleInit() {
        const {url: host, port} = this.config.get().redis;

        this.publisher = new Redis({host, port});
        this.subscriber = new Redis({host, port});

        await this.subscriber.psubscribe('event:*');

        this.subscriber.on('pmessage', (_pattern: string, channel: string, raw: string) => {
            try {
                const msg = JSON.parse(raw) as ISocketMessage & { userId?: string };

                if (channel === PUBLIC_CHANNEL) {
                    this.deliverToAll(msg);
                } else if (channel.startsWith(PRIVATE_PREFIX)) {
                    const userId = channel.slice(PRIVATE_PREFIX.length);
                    this.deliverToUser(userId, msg);
                }
            } catch (err) {
                this.logger.error('Failed to parse Redis event message', err);
            }
        });
    }

    async onModuleDestroy() {
        await this.publisher.quit();
        await this.subscriber.quit();
    }

    public setUser(sessionId: string, userId: string) {
        if (userId) {
            userMap.set(sessionId, userId);
        } else {
            userMap.delete(sessionId);
        }
    }

    public setEvents(sessionId: string, items: IEventMapItem[]) {
        eventMap.set(sessionId, items);
    }

    public getEvents(sessionId: string): IEventMapItem[] {
        return eventMap.get(sessionId);
    }

    public subscribe(sessionId: string, send: (message: ISocketMessage) => void) {
        sendMap.set(sessionId, send);
    }

    public unsubscribe(sessionId: string) {
        sendMap.delete(sessionId);
        eventMap.delete(sessionId);
        userMap.delete(sessionId);
    }

    public sendPrivate(message: IPrivateEventMessage): Promise<void> {
        const channel = `${PRIVATE_PREFIX}${message.userId}`;
        return this.publisher.publish(channel, JSON.stringify(message)).then(() => undefined);
    }

    public async sendBroadcast(getMessage: (params: {
        userId: string
    }) => Promise<IPrivateEventMessage>): Promise<void> {
        for (const userId of new Set(userMap.values())) {
            const msg = await getMessage({userId});
            await this.sendPrivate(msg);
        }
    }

    public sendPublic(message: ISocketMessage): Promise<void> {
        return this.publisher.publish(PUBLIC_CHANNEL, JSON.stringify(message)).then(() => undefined);
    }

    private deliverToUser(userId: string, message: ISocketMessage & { userId?: string }) {
        for (const [sessionId, sessUserId] of userMap) {
            if (sessUserId === userId) {
                this.deliverToSession(sessionId, message);
            }
        }
    }

    private deliverToAll(message: ISocketMessage & { userId?: string }) {
        for (const sessionId of sendMap.keys()) {
            this.deliverToSession(sessionId, message);
        }
    }

    private deliverToSession(sessionId: string, message: ISocketMessage & { userId?: string }) {
        const send = sendMap.get(sessionId);
        if (!send) return;

        const items = eventMap.get(sessionId) ?? [];

        for (const item of items) {
            if (item.payloadType !== message.payloadType) continue;

            const keys = Object.keys(item.payload as object);
            const params: Record<string, unknown> = {};

            for (const key of keys) {
                params[key] = (message.payload as Record<string, unknown>)[key];
            }

            const key = message.userId
                ? `${message.userId}-${message.payloadType}-${JSON.stringify(params)}`
                : `${message.payloadType}-${JSON.stringify(params)}`;

            if (item.key === key) {
                const {userId: _uid, ...cleanMessage} = message;
                this.logger.log(`Send payloadType ${message.payloadType} → session ${sessionId}`);
                send(cleanMessage as ISocketMessage);
            }
        }
    }
}
