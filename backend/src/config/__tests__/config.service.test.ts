import {ConfigService} from '../config.service';

describe('ConfigService', () => {
    let service: ConfigService;

    beforeEach(() => {
        service = new ConfigService();
    });

    afterEach(() => {
        // Clean up environment variables
        delete process.env.REDIS_HOST;
        delete process.env.REDIS_PORT;
        delete process.env.MONGO_HOST;
        delete process.env.MONGO_PORT;
        delete process.env.MONGO_USER;
        delete process.env.MONGO_PASSWORD;
        delete process.env.MONGO_DB;
        delete process.env.JWT_SECRET;
    });

    describe('get', () => {
        it('should return default configuration when no env vars are set', () => {
            const config = service.get();

            expect(config).toEqual({
                redis: {
                    url: '127.0.0.1',
                    port: 6379,
                },
                mongodb: {
                    ssl: false,
                    host: '127.0.0.1',
                    port: 27017,
                    user: 'root',
                    password: '123123',
                    database: 'chatapp',
                },
                auth: {
                    tokenLifetime: 7 * 24 * 60 * 60 * 1000,
                    jwtSecret: 'change-me-in-production',
                    jwtAccessExpiresIn: 60 * 60,
                    jwtRefreshExpiresIn: 7 * 24 * 60 * 60,
                },
            });
        });

        it('should use custom Redis configuration from env vars', () => {
            process.env.REDIS_HOST = 'custom-redis-host';
            process.env.REDIS_PORT = '6380';

            const config = service.get();

            expect(config.redis.url).toBe('custom-redis-host');
            expect(config.redis.port).toBe(6380);
        });

        it('should use custom MongoDB configuration from env vars', () => {
            process.env.MONGO_HOST = 'custom-mongo-host';
            process.env.MONGO_PORT = '27018';
            process.env.MONGO_USER = 'custom-user';
            process.env.MONGO_PASSWORD = 'custom-password';
            process.env.MONGO_DB = 'custom-database';

            const config = service.get();

            expect(config.mongodb.host).toBe('custom-mongo-host');
            expect(config.mongodb.port).toBe(27018);
            expect(config.mongodb.user).toBe('custom-user');
            expect(config.mongodb.password).toBe('custom-password');
            expect(config.mongodb.database).toBe('custom-database');
        });

        it('should use custom JWT secret from env vars', () => {
            process.env.JWT_SECRET = 'my-custom-secret';

            const config = service.get();

            expect(config.auth.jwtSecret).toBe('my-custom-secret');
        });

        it('should always have ssl set to false for MongoDB', () => {
            const config = service.get();

            expect(config.mongodb.ssl).toBe(false);
        });

        it('should have fixed auth token lifetime', () => {
            const config = service.get();

            expect(config.auth.tokenLifetime).toBe(7 * 24 * 60 * 60 * 1000);
        });

        it('should have fixed JWT access and refresh expiration times', () => {
            const config = service.get();

            expect(config.auth.jwtAccessExpiresIn).toBe(60 * 60);
            expect(config.auth.jwtRefreshExpiresIn).toBe(7 * 24 * 60 * 60);
        });

        it('should parse port numbers correctly', () => {
            process.env.REDIS_PORT = '7000';
            process.env.MONGO_PORT = '3000';

            const config = service.get();

            expect(config.redis.port).toBe(7000);
            expect(config.mongodb.port).toBe(3000);
        });
    });
});
