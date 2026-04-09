import {ModuleMetadata} from '@nestjs/common';

export interface DatabaseOptions {
    label: string;
    host: string;
    port: number;
    user: string;
    password: string;
    database: string;
    ssl?: boolean;
    log?: boolean;
}

export interface DatabaseAsyncOptions extends Pick<ModuleMetadata, 'imports'> {
    useFactory?: (...args: any[]) => Promise<DatabaseOptions> | DatabaseOptions;
    inject?: any[];
}

export const DATABASE_OPTIONS = 'DATABASE_OPTIONS';
