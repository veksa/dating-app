import {DynamicModule, Module} from '@nestjs/common';
import {DATABASE_OPTIONS, DatabaseAsyncOptions} from './database.interface';
import {DatabaseService} from './database.service';

@Module({})
export class DatabaseModule {
    public static registerAsync(options: DatabaseAsyncOptions): DynamicModule {
        return {
            module: DatabaseModule,
            global: true,
            imports: options.imports,
            providers: [
                {
                    provide: DATABASE_OPTIONS,
                    useFactory: options.useFactory,
                    inject: options.inject || [],
                },
                {
                    provide: DatabaseService,
                    useClass: DatabaseService,
                },
            ],
            exports: [
                DatabaseService,
            ],
        };
    }
}
