import {DynamicModule, Module} from '@nestjs/common';
import {StoryService} from './story.service';
import {StoryController} from './story.controller';
import {AuthModule} from '../auth/auth.module';
import {EventModule} from '../event/event.module';
import {JwtGuard} from '../_guards/jwt.guard';

@Module({})
export class StoryModule {
    static register(): DynamicModule {
        return {
            module: StoryModule,
            imports: [AuthModule.register(), EventModule.register()],
            controllers: [StoryController],
            providers: [StoryService, JwtGuard],
        };
    }
}
