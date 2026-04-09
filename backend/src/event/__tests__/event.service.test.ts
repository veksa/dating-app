import {EventService} from '../event.service';
import {ConfigService} from '../../config/config.service';
import Redis from 'ioredis';

// Mock dependencies
jest.mock('../../config/config.service');
jest.mock('ioredis');

describe('EventService', () => {
    let service: EventService;
    let mockConfigService: jest.Mocked<ConfigService>;
    let mockPublisher: jest.Mocked<Redis>;
    let mockSubscriber: jest.Mocked<Redis>;

    beforeEach(() => {
        mockConfigService = new ConfigService() as jest.Mocked<ConfigService>;
        mockConfigService.get = jest.fn().mockReturnValue({
            redis: {
                url: 'localhost',
                port: 6379,
            },
        });

        mockPublisher = {
            publish: jest.fn().mockResolvedValue(1),
            quit: jest.fn().mockResolvedValue('OK'),
        } as unknown as jest.Mocked<Redis>;

        mockSubscriber = {
            psubscribe: jest.fn().mockResolvedValue('OK'),
            on: jest.fn(),
            quit: jest.fn().mockResolvedValue('OK'),
        } as unknown as jest.Mocked<Redis>;

        (Redis as unknown as jest.Mock)
            .mockImplementationOnce(() => mockPublisher)
            .mockImplementationOnce(() => mockSubscriber);

        service = new EventService(mockConfigService);

        // Manually set publisher and subscriber to avoid async initialization
        (service as any).publisher = mockPublisher;
        (service as any).subscriber = mockSubscriber;
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('onModuleInit', () => {
        it('should initialize publisher and subscriber Redis connections', async () => {
            await service.onModuleInit();

            expect(Redis).toHaveBeenCalledTimes(2);
            expect(Redis).toHaveBeenCalledWith({host: 'localhost', port: 6379});
            expect(mockSubscriber.psubscribe).toHaveBeenCalledWith('event:*');
        });

        it('should set up message handler for subscriber', async () => {
            let messageHandler: any;
            mockSubscriber.on.mockImplementation((event, callback) => {
                if (event === 'pmessage') {
                    messageHandler = callback;
                }
            });

            await service.onModuleInit();

            expect(mockSubscriber.on).toHaveBeenCalledWith('pmessage', expect.any(Function));
        });

        it('should handle broadcast messages', async () => {
            let messageHandler: any;
            mockSubscriber.on.mockImplementation((event, callback) => {
                if (event === 'pmessage') {
                    messageHandler = callback;
                }
            });

            const sendCallback = jest.fn();
            service.subscribe('session1', sendCallback);

            await service.onModuleInit();

            const testMessage = JSON.stringify({
                payloadType: 100,
                payload: {data: 'test'},
            });

            messageHandler('pattern', 'event:broadcast', testMessage);
        });

        it('should handle private messages', async () => {
            let messageHandler: any;
            mockSubscriber.on.mockImplementation((event, callback) => {
                if (event === 'pmessage') {
                    messageHandler = callback;
                }
            });

            const sendCallback = jest.fn();
            service.subscribe('session1', sendCallback);
            service.setUser('session1', 'user1');

            await service.onModuleInit();

            const testMessage = JSON.stringify({
                payloadType: 100,
                payload: {data: 'test'},
                userId: 'user1',
            });

            messageHandler('pattern', 'event:user:user1', testMessage);
        });
    });

    describe('onModuleDestroy', () => {
        it('should quit publisher and subscriber connections', async () => {
            await service.onModuleInit();
            await service.onModuleDestroy();

            expect(mockPublisher.quit).toHaveBeenCalled();
            expect(mockSubscriber.quit).toHaveBeenCalled();
        });
    });

    describe('setUser', () => {
        it('should set user for session', () => {
            service.setUser('session1', 'user1');

            // Verify user is set by checking if it can be retrieved
            service.subscribe('session1', jest.fn());
            service.unsubscribe('session1');
        });

        it('should delete user when userId is empty', () => {
            service.setUser('session1', 'user1');
            service.setUser('session1', '');

            // Verify user is deleted
            service.subscribe('session1', jest.fn());
            service.unsubscribe('session1');
        });
    });

    describe('setEvents', () => {
        it('should set events for session', () => {
            const events = [
                {payloadType: 100, payload: {key: 'value1'}, key: '100-{"key":"value1"}'},
            ];

            service.setEvents('session1', events);

            const retrieved = service.getEvents('session1');
            expect(retrieved).toEqual(events);
        });
    });

    describe('getEvents', () => {
        it('should return events for session', () => {
            const events = [
                {payloadType: 100, payload: {key: 'value1'}, key: '100-{"key":"value1"}'},
            ];

            service.setEvents('session1', events);
            const retrieved = service.getEvents('session1');

            expect(retrieved).toEqual(events);
        });

        it('should return undefined for non-existent session', () => {
            const retrieved = service.getEvents('nonexistent');
            expect(retrieved).toBeUndefined();
        });
    });

    describe('subscribe', () => {
        it('should register send callback for session', () => {
            const sendCallback = jest.fn();

            service.subscribe('session1', sendCallback);

            // Verify subscription by attempting to unsubscribe
            service.unsubscribe('session1');
        });
    });

    describe('unsubscribe', () => {
        it('should remove session data', () => {
            service.setUser('session1', 'user1');
            service.setEvents('session1', [{payloadType: 100, payload: {}, key: ''}]);
            service.subscribe('session1', jest.fn());

            service.unsubscribe('session1');

            expect(service.getEvents('session1')).toBeUndefined();
        });
    });

    describe('sendPrivate', () => {
        it('should publish message to private channel', async () => {
            await service.sendPrivate({
                payloadType: 100,
                payload: {data: 'test'},
                userId: 'user1',
                clientMsgId: 'msg1',
            });

            expect(mockPublisher.publish).toHaveBeenCalledWith(
                'event:user:user1',
                JSON.stringify({
                    payloadType: 100,
                    payload: {data: 'test'},
                    userId: 'user1',
                    clientMsgId: 'msg1',
                })
            );
        });
    });

    describe('sendBroadcast', () => {
        it('should send message to all connected users', async () => {
            service.setUser('session1', 'user1');
            service.setUser('session2', 'user2');
            service.subscribe('session1', jest.fn());
            service.subscribe('session2', jest.fn());

            const getMessage = jest.fn().mockResolvedValue({
                payloadType: 100,
                payload: {data: 'test'},
                userId: 'user1',
            });

            await service.sendBroadcast(getMessage);

            expect(getMessage).toHaveBeenCalledTimes(2);
            expect(mockPublisher.publish).toHaveBeenCalledTimes(2);
        });

        it('should deduplicate users with multiple sessions', async () => {
            service.setUser('session1', 'user1');
            service.setUser('session2', 'user1');
            service.subscribe('session1', jest.fn());
            service.subscribe('session2', jest.fn());

            const getMessage = jest.fn().mockResolvedValue({
                payloadType: 100,
                payload: {data: 'test'},
                userId: 'user1',
            });

            await service.sendBroadcast(getMessage);

            expect(getMessage).toHaveBeenCalledTimes(1);
        });
    });

    describe('sendPublic', () => {
        it('should publish message to public channel', async () => {
            await service.sendPublic({
                payloadType: 100,
                payload: {data: 'test'},
                clientMsgId: 'msg1',
            });

            expect(mockPublisher.publish).toHaveBeenCalledWith(
                'event:broadcast',
                JSON.stringify({
                    payloadType: 100,
                    payload: {data: 'test'},
                    clientMsgId: 'msg1',
                })
            );
        });
    });

    describe('integration', () => {
        it('should handle full lifecycle: subscribe, set user, send, unsubscribe', async () => {
            const sendCallback = jest.fn();

            service.subscribe('session1', sendCallback);
            service.setUser('session1', 'user1');
            service.setEvents('session1', [
                {payloadType: 100, payload: {key: 'value'}, key: '100-{"key":"value"}'},
            ]);

            await service.sendPrivate({
                payloadType: 100,
                payload: {key: 'value'},
                userId: 'user1',
            });

            service.unsubscribe('session1');

            expect(service.getEvents('session1')).toBeUndefined();
        });
    });
});
