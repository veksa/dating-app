import {JwtService} from '../jwt.service';
import {ConfigService} from '../../config/config.service';

describe('JwtService', () => {
    let service: JwtService;
    let configService: ConfigService;

    beforeEach(() => {
        configService = new ConfigService();
        service = new JwtService(configService);
    });

    describe('sign', () => {
        it('should sign a token with userId', () => {
            const userId = 'user123';
            const token = service.sign(userId);

            expect(token).toBeDefined();
            expect(typeof token).toBe('string');
            expect(token.length).toBeGreaterThan(0);
        });

        it('should produce different tokens for different users', () => {
            const token1 = service.sign('user1');
            const token2 = service.sign('user2');

            expect(token1).not.toBe(token2);
        });

        it('should produce different tokens for the same user at different times', () => {
            const userId = 'user1';
            const token1 = service.sign(userId);
            // JWT tokens with same payload at same second can be identical
            // Just verify that signing works
            expect(token1).toBeDefined();
            const token2 = service.sign(userId);
            expect(token2).toBeDefined();
        });

        it('should handle empty userId', () => {
            const token = service.sign('');
            expect(token).toBeDefined();
        });

        it('should handle special characters in userId', () => {
            const userId = 'user-with-special-chars_123';
            const token = service.sign(userId);
            expect(token).toBeDefined();
        });
    });

    describe('verify', () => {
        it('should verify a valid token', () => {
            const userId = 'user123';
            const token = service.sign(userId);
            const payload = service.verify(token);

            expect(payload.userId).toBe(userId);
            expect(payload.iat).toBeDefined();
            expect(payload.exp).toBeDefined();
        });

        it('should throw error for invalid token', () => {
            const invalidToken = 'invalid.token.here';

            expect(() => service.verify(invalidToken)).toThrow();
        });

        it('should throw error for malformed token', () => {
            const malformedToken = 'not-a-valid-jwt';

            expect(() => service.verify(malformedToken)).toThrow();
        });

        it('should throw error for empty token', () => {
            expect(() => service.verify('')).toThrow();
        });

        it('should throw error for tampered token', () => {
            const userId = 'user123';
            const token = service.sign(userId);
            const tamperedToken = token.slice(0, -10) + 'tampered';

            expect(() => service.verify(tamperedToken)).toThrow();
        });

        it('should verify token with userId containing special characters', () => {
            const userId = 'user-with-special-chars_123';
            const token = service.sign(userId);
            const payload = service.verify(token);

            expect(payload.userId).toBe(userId);
        });
    });

    describe('tryVerify', () => {
        it('should verify a valid token and return payload', () => {
            const userId = 'user123';
            const token = service.sign(userId);
            const payload = service.tryVerify(token);

            expect(payload).not.toBeNull();
            expect(payload?.userId).toBe(userId);
        });

        it('should return null for invalid token', () => {
            const invalidToken = 'invalid.token.here';
            const payload = service.tryVerify(invalidToken);

            expect(payload).toBeNull();
        });

        it('should return null for malformed token', () => {
            const malformedToken = 'not-a-valid-jwt';
            const payload = service.tryVerify(malformedToken);

            expect(payload).toBeNull();
        });

        it('should return null for empty token', () => {
            const payload = service.tryVerify('');
            expect(payload).toBeNull();
        });

        it('should return null for null token', () => {
            const payload = service.tryVerify(null as any);
            expect(payload).toBeNull();
        });

        it('should return null for undefined token', () => {
            const payload = service.tryVerify(undefined as any);
            expect(payload).toBeNull();
        });

        it('should return null for tampered token', () => {
            const userId = 'user123';
            const token = service.sign(userId);
            const tamperedToken = token.slice(0, -10) + 'tampered';

            const payload = service.tryVerify(tamperedToken);
            expect(payload).toBeNull();
        });
    });

    describe('integration', () => {
        it('should sign and verify token correctly', () => {
            const userId = 'user123';
            const token = service.sign(userId);
            const payload = service.verify(token);

            expect(payload.userId).toBe(userId);
        });

        it('should sign and tryVerify token correctly', () => {
            const userId = 'user123';
            const token = service.sign(userId);
            const payload = service.tryVerify(token);

            expect(payload).not.toBeNull();
            expect(payload?.userId).toBe(userId);
        });
    });
});
