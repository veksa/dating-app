import {Injectable} from '@nestjs/common';
import {validateEmail} from "./_helpers/validateEmail";
import {throwErrorMessage} from "../_helpers/throwErrorMessage";
import md5 from "md5";
import {v4} from "uuid";
import {ConfigService} from "../config/config.service";
import {CacheService} from "../cache/cache.service";
import {makeRefreshTokenKey} from "./_helpers/refreshToken";
import {JwtService} from "../jwt/jwt.service";
import {User} from "../database/models/user.model";
import {IAuthTokens, IRefreshTokenCache} from "./auth.interface";


@Injectable()
export class AuthService {
    constructor(
        private config: ConfigService,
        private cache: CacheService,
        private jwt: JwtService,
    ) {
    }

    public async register(email: string, password: string, username: string): Promise<IAuthTokens> {
        if (!email) {
            throwErrorMessage({errorCode: 'INVALID_REQUEST', description: 'Email should be specified'});
        }

        if (!validateEmail(email)) {
            throwErrorMessage({
                errorCode: 'INVALID_REQUEST',
                description: 'Email should be a valid email'
            })
        }

        if (!password) {
            throwErrorMessage({errorCode: 'INVALID_REQUEST', description: 'Password should be specified'});
        }

        if (!username) {
            throwErrorMessage({errorCode: 'INVALID_REQUEST', description: 'Username should be specified'});
        }

        const existingEmail = await User.findOne({email: email.toLowerCase(), deleted: false});
        if (existingEmail) {
            throwErrorMessage({errorCode: 'EMAIL_ALREADY_EXISTS'});
        }

        const existingUsername = await User.findOne({username: username.toLowerCase(), deleted: false});
        if (existingUsername) {
            throwErrorMessage({errorCode: 'USERNAME_ALREADY_EXISTS'});
        }

        const user = await User.create({
            email: email.toLowerCase(),
            username: username.toLowerCase(),
            passwordHash: md5(password),
        });

        return this.createTokens(user._id.toString(), user.username);
    }

    public async login(email: string, password: string): Promise<IAuthTokens> {
        if (!email) {
            throwErrorMessage({errorCode: 'INVALID_REQUEST', description: 'Email should be specified'});
        }

        if (!validateEmail(email)) {
            throwErrorMessage({
                errorCode: 'INVALID_REQUEST',
                description: 'Email should be a valid email'
            });
        }

        if (!password) {
            throwErrorMessage({errorCode: 'INVALID_REQUEST', description: 'Password should be specified'});
        }

        const user = await User.findOne({email: email.toLowerCase(), deleted: false});
        if (!user) {
            throwErrorMessage({errorCode: 'USER_DOES_NOT_EXISTS'});
        }

        if (md5(password) !== user.passwordHash) {
            throwErrorMessage({errorCode: 'INVALID_PASSWORD'});
        }

        return this.createTokens(user._id.toString(), user.username);
    }

    public async refresh(refreshToken: string): Promise<IAuthTokens> {
        if (!refreshToken) {
            throwErrorMessage({errorCode: 'INVALID_REQUEST', description: 'Refresh token required'});
        }

        const key = makeRefreshTokenKey(refreshToken);
        const raw = await this.cache.get('auth', key);
        if (!raw) {
            throwErrorMessage({errorCode: 'INVALID_TOKEN'});
        }

        const cached: IRefreshTokenCache = JSON.parse(raw);
        if (cached.expiresAt < Date.now()) {
            await this.cache.delete('auth', key);
            throwErrorMessage({errorCode: 'TOKEN_EXPIRED'});
        }

        const user = await User.findOne({_id: cached.userId, deleted: false});
        if (!user) {
            throwErrorMessage({errorCode: 'USER_DOES_NOT_EXISTS'});
        }

        await this.cache.delete('auth', key);
        return this.createTokens(user._id.toString(), user.username);
    }

    public async logout(refreshToken: string): Promise<void> {
        if (!refreshToken) {
            return;
        }
        await this.cache.delete('auth', makeRefreshTokenKey(refreshToken));
    }

    private async createTokens(userId: string, username: string): Promise<IAuthTokens> {
        const cfg = this.config.get();
        const accessToken = this.jwt.sign(userId);
        const refreshToken = v4();
        const expiresAt = Date.now() + cfg.auth.jwtRefreshExpiresIn * 1000;

        const key = makeRefreshTokenKey(refreshToken);
        await this.cache.set('auth', key, JSON.stringify({userId, expiresAt} satisfies IRefreshTokenCache));

        return {accessToken, refreshToken, userId, username};
    }
}
