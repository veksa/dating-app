import {Inject, Injectable, OnModuleDestroy, OnModuleInit} from '@nestjs/common';
import {BehaviorSubject} from "rxjs";
import Redis from "ioredis";
import {CACHE_OPTIONS, CacheOptions} from "./cache.interface";

@Injectable()
export class CacheService implements OnModuleInit, OnModuleDestroy {
    public connect$ = new BehaviorSubject(false);

    private redis: Redis;

    constructor(@Inject(CACHE_OPTIONS) private readonly options: CacheOptions) {
    }

    public async onModuleInit(withTimers = true) {
        await this.planInit(withTimers);
    }

    public onModuleDestroy() {
        this.redis.disconnect();
    }

    private planInit = async (withTimers: boolean) => {
        try {
            await this.initRedis();

            console.log('Redis Service initialized');

            if (withTimers) {
                this.planCheckRedis();
            }
        } catch (error) {
            this.connect$.next(false);

            console.log('Redis Service is down');

            if (withTimers) {
                setTimeout(() => {
                    this.planInit(withTimers);
                }, 5000);
            }
        }
    };

    private async initRedis() {
        return new Promise<void>((resolve, reject) => {
            this.redis = new Redis({
                host: this.options.url,
                port: this.options.port,
                maxRetriesPerRequest: 1,
            });

            this.redis.on('connect', () => {
                resolve();
            })

            this.redis.on('error', () => {
                reject();
            });
        });
    }

    private planCheckRedis = async () => {
        try {
            await this.redis.set('test-key-redis-service', 'test-key-redis-service');

            this.connect$.next(true);
        } catch (error) {
            this.connect$.next(false);

            console.log('Redis Service is down');
        }

        setTimeout(() => {
            this.planCheckRedis();
        }, 5000);
    };

    public async get(prefix: string, key: string): Promise<string | null> {
        if (this.connect$.value) {
            return this.redis.get(`${prefix}:${key}`);
        }

        return null;
    }

    public async set(prefix: string, key: string, value: string): Promise<void> {
        if (this.connect$.value) {
            await this.redis.set(`${prefix}:${key}`, value);
        }
    }

    public async delete(prefix: string, key: string): Promise<void> {
        if (this.connect$.value) {
            await this.redis.del(`${prefix}:${key}`);
        }
    }
}
