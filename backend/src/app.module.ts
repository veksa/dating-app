import {Module} from '@nestjs/common';
import {AppController} from './app.controller';
import {AppGateway} from "./app.gateway";
import {AuthModule} from "./auth/auth.module";
import {ChatModule} from "./chat/chat.module";
import {StoryModule} from "./story/story.module";
import {ConfigModule} from "./config/config.module";
import {EventModule} from "./event/event.module";
import {JwtService} from "./jwt/jwt.service";

@Module({
    imports: [
        ConfigModule.register(),
        EventModule.register(),
        AuthModule.register(),
        ChatModule.register(),
        StoryModule.register(),
    ],
    controllers: [
        AppController,
    ],
    providers: [
        AppGateway,
        JwtService,
    ],
})
export class AppModule {
}
