import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module.js';
import { configureApp } from './app.setup.js';
import { type AppConfig, appConfig } from './config/app.config.js';
import { AdminBootstrapService } from './users/admin-bootstrap.service.js';

const app = await NestFactory.create<NestExpressApplication>(AppModule);
configureApp(app);
app.enableShutdownHooks();
await app.get(AdminBootstrapService).run();

const { host, port } = app.get<AppConfig>(appConfig.KEY);
await app.listen(port, host);
