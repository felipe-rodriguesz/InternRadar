import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ENVIRONMENT } from './config/environment';
import type { Environment } from './config/environment';
import { ApiExceptionFilter } from './common/api-exception.filter';

export async function createApplication(logging = true) {
  const app = await NestFactory.create(AppModule, {
    logger: logging ? ['error', 'warn', 'log'] : false,
    abortOnError: false,
  });
  app.setGlobalPrefix('api/v1');
  // A rota histórica /health é um alias explícito, sem duplicar lógica de saúde.
  const server = app.getHttpAdapter().getInstance() as {
    get: (
      path: string,
      handler: (
        _request: unknown,
        response: { redirect: (code: number, path: string) => void },
      ) => void,
    ) => void;
  };
  server.get('/health', (_request, response) => response.redirect(307, '/api/v1/health'));
  const env = app.get<Environment>(ENVIRONMENT);
  app.enableCors({
    origin: env.CORS_ORIGINS,
    methods: ['GET', 'HEAD', 'OPTIONS'],
    credentials: false,
  });
  app.useGlobalFilters(new ApiExceptionFilter());
  app.enableShutdownHooks();
  return app;
}
