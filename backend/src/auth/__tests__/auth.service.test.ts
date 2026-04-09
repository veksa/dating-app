import {AuthService} from '../auth.service';
import {ConfigService} from '../../config/config.service';
import {CacheService} from '../../cache/cache.service';
import {JwtService} from '../../jwt/jwt.service';
import {User} from '../../database/models/user.model';

// Mock dependencies
jest.mock('../../config/config.service');
jest.mock('../../cache/cache.service');
jest.mock('../../jwt/jwt.service');
jest.mock('md5', () => ({
    __esModule: true,
    default: jest.fn((str: string) => `hashed_${str}`),
}));
jest.mock('uuid', () => ({
    v4: jest.fn(() => 'mock-refresh-token'),
}));

describe('AuthService', () => {
    let service: AuthService;
    let mockConfigService: jest.Mocked<ConfigService>;
    let mockCacheService: jest.Mocked<CacheService>;
    let mockJwtService: jest.Mocked<JwtService>;

    beforeEach(() => {
        mockConfigService = new ConfigService() as jest.Mocked<ConfigService>;
        mockCacheService = new CacheService({url: 'localhost', port: 6379}) as jest.Mocked<CacheService>;
        mockJwtService = new JwtService(mockConfigService) as jest.Mocked<JwtService>;

        mockConfigService.get = jest.fn().mockReturnValue({
            auth: {
                tokenLifetime: 7 * 24 * 60 * 60 * 1000,
                jwtSecret: 'test-secret',
                jwtAccessExpiresIn: 60 * 60,
                jwtRefreshExpiresIn: 7 * 24 * 60 * 60,
            },
        });

        mockJwtService.sign = jest.fn().mockReturnValue('mock-access-token');
        mockCacheService.set = jest.fn().mockResolvedValue(undefined);
        mockCacheService.get = jest.fn().mockResolvedValue(null);
        mockCacheService.delete = jest.fn().mockResolvedValue(undefined);

        service = new AuthService(mockConfigService, mockCacheService, mockJwtService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('register', () => {
        it('should throw error if email is not provided', async () => {
            await expect(service.register('', 'password123', 'username'))
                .rejects.toThrow('Email should be specified');
        });

        it('should throw error if email is invalid', async () => {
            await expect(service.register('invalid-email', 'password123', 'username'))
                .rejects.toThrow('Email should be a valid email');
        });

        it('should throw error if password is not provided', async () => {
            await expect(service.register('test@example.com', '', 'username'))
                .rejects.toThrow('Password should be specified');
        });

        it('should throw error if username is not provided', async () => {
            await expect(service.register('test@example.com', 'password123', ''))
                .rejects.toThrow('Username should be specified');
        });

        it('should throw error if email already exists', async () => {
            (User.findOne as jest.Mock).mockResolvedValueOnce({_id: 'user123'});

            await expect(service.register('test@example.com', 'password123', 'username'))
                .rejects.toThrow('EMAIL_ALREADY_EXISTS');
        });

        it('should throw error if username already exists', async () => {
            (User.findOne as jest.Mock)
                .mockResolvedValueOnce(null) // email check
                .mockResolvedValueOnce({_id: 'user123'}); // username check

            await expect(service.register('test@example.com', 'password123', 'username'))
                .rejects.toThrow('USERNAME_ALREADY_EXISTS');
        });

        it('should create user and return tokens on successful registration', async () => {
            const mockUser = {
                _id: {toString: () => 'user123'},
                username: 'username',
                email: 'test@example.com',
            };

            (User.findOne as jest.Mock).mockResolvedValue(null);
            (User.create as jest.Mock).mockResolvedValue(mockUser);

            const result = await service.register('test@example.com', 'password123', 'username');

            expect(result).toEqual({
                accessToken: 'mock-access-token',
                refreshToken: 'mock-refresh-token',
                userId: 'user123',
                username: 'username',
            });

            expect(User.create).toHaveBeenCalledWith({
                email: 'test@example.com',
                username: 'username',
                passwordHash: 'hashed_password123',
            });

            expect(mockCacheService.set).toHaveBeenCalled();
            expect(mockJwtService.sign).toHaveBeenCalledWith('user123');
        });

        it('should convert email and username to lowercase', async () => {
            const mockUser = {
                _id: {toString: () => 'user123'},
                username: 'username',
                email: 'test@example.com',
            };

            (User.findOne as jest.Mock).mockResolvedValue(null);
            (User.create as jest.Mock).mockResolvedValue(mockUser);

            await service.register('TEST@EXAMPLE.COM', 'password123', 'USERNAME');

            expect(User.create).toHaveBeenCalledWith({
                email: 'test@example.com',
                username: 'username',
                passwordHash: 'hashed_password123',
            });
        });
    });

    describe('login', () => {
        it('should throw error if email is not provided', async () => {
            await expect(service.login('', 'password123'))
                .rejects.toThrow('Email should be specified');
        });

        it('should throw error if email is invalid', async () => {
            await expect(service.login('invalid-email', 'password123'))
                .rejects.toThrow('Email should be a valid email');
        });

        it('should throw error if password is not provided', async () => {
            await expect(service.login('test@example.com', ''))
                .rejects.toThrow('Password should be specified');
        });

        it('should throw error if user does not exist', async () => {
            (User.findOne as jest.Mock).mockResolvedValue(null);

            await expect(service.login('test@example.com', 'password123'))
                .rejects.toThrow('USER_DOES_NOT_EXISTS');
        });

        it('should throw error if password is incorrect', async () => {
            const mockUser = {
                _id: {toString: () => 'user123'},
                username: 'username',
                passwordHash: 'hashed_wrongpassword',
            };

            (User.findOne as jest.Mock).mockResolvedValue(mockUser);

            await expect(service.login('test@example.com', 'password123'))
                .rejects.toThrow('INVALID_PASSWORD');
        });

        it('should return tokens on successful login', async () => {
            const mockUser = {
                _id: {toString: () => 'user123'},
                username: 'username',
                passwordHash: 'hashed_password123',
            };

            (User.findOne as jest.Mock).mockResolvedValue(mockUser);

            const result = await service.login('test@example.com', 'password123');

            expect(result).toEqual({
                accessToken: 'mock-access-token',
                refreshToken: 'mock-refresh-token',
                userId: 'user123',
                username: 'username',
            });

            expect(mockCacheService.set).toHaveBeenCalled();
            expect(mockJwtService.sign).toHaveBeenCalledWith('user123');
        });

        it('should convert email to lowercase when searching', async () => {
            const mockUser = {
                _id: {toString: () => 'user123'},
                username: 'username',
                passwordHash: 'hashed_password123',
            };

            (User.findOne as jest.Mock).mockResolvedValue(mockUser);

            await service.login('TEST@EXAMPLE.COM', 'password123');

            expect(User.findOne).toHaveBeenCalledWith({
                email: 'test@example.com',
                deleted: false,
            });
        });
    });

    describe('refresh', () => {
        it('should throw error if refresh token is not provided', async () => {
            await expect(service.refresh(''))
                .rejects.toThrow('Refresh token required');
        });

        it('should throw error if refresh token is invalid', async () => {
            mockCacheService.get = jest.fn().mockResolvedValue(null);

            await expect(service.refresh('invalid-token'))
                .rejects.toThrow('INVALID_TOKEN');
        });

        it('should throw error if token is expired', async () => {
            const expiredCache = JSON.stringify({
                userId: 'user123',
                expiresAt: Date.now() - 1000,
            });

            mockCacheService.get = jest.fn().mockResolvedValue(expiredCache);

            await expect(service.refresh('expired-token'))
                .rejects.toThrow('TOKEN_EXPIRED');

            expect(mockCacheService.delete).toHaveBeenCalled();
        });

        it('should throw error if user does not exist', async () => {
            const validCache = JSON.stringify({
                userId: 'user123',
                expiresAt: Date.now() + 1000000,
            });

            mockCacheService.get = jest.fn().mockResolvedValue(validCache);
            (User.findOne as jest.Mock).mockResolvedValue(null);

            await expect(service.refresh('valid-token'))
                .rejects.toThrow('USER_DOES_NOT_EXISTS');
        });

        it('should return new tokens on successful refresh', async () => {
            const mockUser = {
                _id: {toString: () => 'user123'},
                username: 'username',
            };

            const validCache = JSON.stringify({
                userId: 'user123',
                expiresAt: Date.now() + 1000000,
            });

            mockCacheService.get = jest.fn().mockResolvedValue(validCache);
            (User.findOne as jest.Mock).mockResolvedValue(mockUser);

            const result = await service.refresh('valid-token');

            expect(result).toEqual({
                accessToken: 'mock-access-token',
                refreshToken: 'mock-refresh-token',
                userId: 'user123',
                username: 'username',
            });

            expect(mockCacheService.delete).toHaveBeenCalled();
            expect(mockJwtService.sign).toHaveBeenCalledWith('user123');
        });

        it('should delete old refresh token before creating new one', async () => {
            const mockUser = {
                _id: {toString: () => 'user123'},
                username: 'username',
            };

            const validCache = JSON.stringify({
                userId: 'user123',
                expiresAt: Date.now() + 1000000,
            });

            mockCacheService.get = jest.fn().mockResolvedValue(validCache);
            (User.findOne as jest.Mock).mockResolvedValue(mockUser);

            await service.refresh('valid-token');

            expect(mockCacheService.delete).toHaveBeenCalled();
        });
    });

    describe('logout', () => {
        it('should delete refresh token from cache', async () => {
            await service.logout('valid-refresh-token');

            expect(mockCacheService.delete).toHaveBeenCalledWith('auth', expect.any(String));
        });

        it('should not throw error if refresh token is empty', async () => {
            await expect(service.logout('')).resolves.not.toThrow();
            expect(mockCacheService.delete).not.toHaveBeenCalled();
        });

        it('should not throw error if refresh token is not provided', async () => {
            await expect(service.logout(undefined as any)).resolves.not.toThrow();
            expect(mockCacheService.delete).not.toHaveBeenCalled();
        });
    });
});
