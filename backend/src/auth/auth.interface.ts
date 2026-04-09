export interface IRefreshTokenCache {
    userId: string;
    expiresAt: number;
}

export interface IAuthTokens {
    accessToken: string;
    refreshToken: string;
    userId: string;
    username: string;
}
