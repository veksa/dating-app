import {DynamicModule, Module} from '@nestjs/common';
import {ChatService} from './chat.service';
import {ChatController} from './chat.controller';
import {EventModule} from '../event/event.module';
import {AuthModule} from '../auth/auth.module';
import {JwtGuard} from '../_guards/jwt.guard';
import {DatabaseModule} from '../database/database.module';
import {ConfigModule} from '../config/config.module';
import {ConfigService} from '../config/config.service';

@Module({})
export class ChatModule {
    public static register(): DynamicModule {
        return {
            imports: [
                EventModule.register(),
                AuthModule.register(),
                DatabaseModule.registerAsync({
                    imports: [ConfigModule.register()],
                    inject: [ConfigService],
                    useFactory: (cfg: ConfigService) => {
                        const c = cfg.get();
                        return {
                            label: 'Chat',
                            host: c.mongodb.host,
                            port: c.mongodb.port,
                            user: c.mongodb.user,
                            password: c.mongodb.password,
                            database: c.mongodb.database,
                            ssl: c.mongodb.ssl
                        };
                    },
                }),
            ],
            module: ChatModule,
            controllers: [ChatController],
            providers: [ChatService, JwtGuard],
            exports: [ChatService],
        };
    }
}
