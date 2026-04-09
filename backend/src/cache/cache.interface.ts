import {ModuleMetadata} from "@nestjs/common";

export interface CacheOptions {
    url: string;
    port: number;
}

export interface CacheAsyncOptions extends Pick<ModuleMetadata, 'imports'> {
    useFactory?: (...args: any[]) => Promise<CacheOptions> | CacheOptions;
    inject?: any[];
}

export const CACHE_OPTIONS = "CACHE_OPTIONS";
