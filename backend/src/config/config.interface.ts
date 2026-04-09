export interface IServiceConfig {
    redis: {
        url: string;
        port: number;
    };
    mongodb: {
        ssl?: boolean;
        host: string;
        port: number;
        user: string;
        password: string;
        database: string;
    };
    auth: {
        tokenLifetime: number;
        jwtSecret: string;
        jwtAccessExpiresIn: number;
        jwtRefreshExpiresIn: number;
    };
}
