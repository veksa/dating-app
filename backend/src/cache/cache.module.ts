import {DynamicModule, Module} from '@nestjs/common';
import {CacheService} from './cache.service';
import {CACHE_OPTIONS, CacheAsyncOptions} from "./cache.interface";

@Module({})
export class CacheModule {
    public static registerAsync(options: CacheAsyncOptions): DynamicModule {
        return {
            module: CacheModule,
            global: true,
            imports: options.imports,
            providers: [
                {
                    provide: CACHE_OPTIONS,
                    useFactory: options.useFactory,
                    inject: options.inject || [],
                },
                {
                    provide: CacheService,
                    useClass: CacheService
                },
            ],
            exports: [
                CacheService,
            ]
        };
    }
}
