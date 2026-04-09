import {Inject, Injectable, OnModuleDestroy, OnModuleInit} from '@nestjs/common';
import {BehaviorSubject} from 'rxjs';
import mongoose from 'mongoose';
import {DATABASE_OPTIONS, type DatabaseOptions} from './database.interface';

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
    public connect$ = new BehaviorSubject(false);
    private checkTimer: ReturnType<typeof setTimeout>;

    constructor(@Inject(DATABASE_OPTIONS) private options: DatabaseOptions) {
    }

    async onModuleInit() {
        await this.connect();
    }

    async onModuleDestroy() {
        clearTimeout(this.checkTimer);
        try {
            await mongoose.disconnect();
            console.log('Database disconnected successfully');
        } catch (error: unknown) {
            console.error('Error disconnecting from database:', error);
        }
    }

    async connect() {
        const sslOption = this.options.ssl ? '&tls=true' : '';
        const url = `mongodb://${this.options.user}:${this.options.password}@${this.options.host}:${this.options.port}/${this.options.database}?authSource=admin${sslOption}`;

        try {
            await mongoose.connect(url);
            console.log('Database connected successfully');
            this.connect$.next(true);
            void this.planCheckDb();
        } catch (error) {
            console.error('Database connection failed');
            this.connect$.next(false);
            this.checkTimer = setTimeout(() => {
                this.connect();
            }, 5000);
        }
    }

    private planCheckDb = async () => {
        try {
            await mongoose.connection.db.command({ping: 1});
            this.connect$.next(true);
        } catch (error) {
            this.connect$.next(false);
            console.log('Database Service is down');
        }

        this.checkTimer = setTimeout(() => {
            this.planCheckDb();
        }, 5000);
    };
}
