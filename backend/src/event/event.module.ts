import {DynamicModule, Module} from '@nestjs/common';
import {EventService} from './event.service';
import {ConfigModule} from "../config/config.module";

@Module({})
export class EventModule {
    public static register(): DynamicModule {
        return {
            imports: [
                ConfigModule.register(),
            ],
            module: EventModule,
            providers: [
                EventService,
            ],
            exports: [
                EventService,
            ],
        };
    }
}
