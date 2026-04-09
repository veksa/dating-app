import {NestFactory} from '@nestjs/core';
import {AppModule} from './app.module';
import {NestExpressApplication} from '@nestjs/platform-express';
import {WsAdapter} from "@nestjs/platform-ws";
import * as fs from 'fs';
import * as path from 'path';

async function bootstrap() {
    fs.mkdirSync(path.join(__dirname, '..', 'uploads', 'stories'), {recursive: true});

    const app = await NestFactory.create<NestExpressApplication>(AppModule);

    app.set('trust proxy', true);
    app.disable('X-Powered-By');

    app.enableCors({
        origin: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
        credentials: true,
    });

    app.useWebSocketAdapter(new WsAdapter(app));

    await app.listen(3000, '0.0.0.0');
}

bootstrap();
