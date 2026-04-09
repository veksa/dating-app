import {Injectable} from '@nestjs/common';
import {IServiceConfig} from "./config.interface";

@Injectable()
export class ConfigService {
    public get(): IServiceConfig {
        return {
            redis: {
                url: process.env['REDIS_HOST'] || '127.0.0.1',
                port: parseInt(process.env['REDIS_PORT'] || '6379', 10),
            },
            mongodb: {
                ssl: false,
                host: process.env['MONGO_HOST'] || '127.0.0.1',
                port: parseInt(process.env['MONGO_PORT'] || '27017', 10),
                user: process.env['MONGO_USER'] || 'root',
                password: process.env['MONGO_PASSWORD'] || '123123',
                database: process.env['MONGO_DB'] || 'chatapp',
            },
            auth: {
                tokenLifetime: 7 * 24 * 60 * 60 * 1000,
                jwtSecret: process.env['JWT_SECRET'] || 'change-me-in-production',
                jwtAccessExpiresIn: 60 * 60,
                jwtRefreshExpiresIn: 7 * 24 * 60 * 60,
            },
        };
    }
}
