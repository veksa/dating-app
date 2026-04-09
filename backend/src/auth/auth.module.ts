import {DynamicModule, Module} from '@nestjs/common';
import {AuthService} from './auth.service';
import {AuthController} from './auth.controller';
import {JwtService} from '../jwt/jwt.service';
import {ConfigModule} from "../config/config.module";
import {CacheModule} from "../cache/cache.module";
import {ConfigService} from "../config/config.service";

@Module({})
export class AuthModule {
    public static register(): DynamicModule {
        return {
            imports: [
                ConfigModule.register(),
                CacheModule.registerAsync({
                    imports: [ConfigModule.register()],
                    inject: [ConfigService],
                    useFactory: (cfg: ConfigService) => {
                        const c = cfg.get();
                        return {url: c.redis.url, port: c.redis.port};
                    },
                }),
            ],
            module: AuthModule,
            controllers: [AuthController],
            providers: [AuthService, JwtService],
            exports: [AuthService, JwtService],
        };
    }
}
