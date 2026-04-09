export const makeRefreshTokenKey = (token: string) => {
    return `refresh-token:${token}`;
}
