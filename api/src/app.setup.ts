import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { ApiExceptionFilter } from './common/api-exception.filter.js';
import { schemaValidationPipe } from './common/schemas.js';
import { type AppConfig, appConfig } from './config/app.config.js';
import { requestLog } from './web/request-log.middleware.js';
import { API_DOCS_PATH, securityHeaders } from './web/security-headers.middleware.js';
import { media, webApp } from './web/static.middleware.js';

export const API_PREFIX = 'api/v1';

/** Everything between creating the application and listening; shared with the e2e tests. */
export function configureApp(app: NestExpressApplication): void {
  const config = app.get<AppConfig>(appConfig.KEY);

  // One reverse proxy in front: its X-Forwarded-For entry is the caller's address.
  if (config.trustProxy) app.set('trust proxy', 1);
  app.disable('x-powered-by');
  app.useBodyParser('json', { limit: '1mb' });
  app.enableCors({
    origin: config.allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Authorization', 'Content-Type', 'X-Requested-With'],
    maxAge: 600,
  });
  app.use(requestLog(), securityHeaders(config), cookieParser());
  app.use('/media', media(config.mediaDir));

  app.setGlobalPrefix(API_PREFIX);
  app.useGlobalPipes(schemaValidationPipe());
  app.useGlobalFilters(new ApiExceptionFilter());

  if (config.apiDocs) {
    const document = new DocumentBuilder()
      .setTitle('Rychta Čenkovice API')
      .setDescription(
        'Public endpoints of the website and the administration behind a bearer token.',
      )
      .setVersion('1')
      .addBearerAuth()
      .build();
    SwaggerModule.setup(API_DOCS_PATH, app, () => SwaggerModule.createDocument(app, document));
  }
  if (config.webDir) app.use(webApp(config.webDir));
}
