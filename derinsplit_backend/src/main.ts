import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { AppModule } from './app.module';
import { RedisIoAdapter } from './realtime/redis-io.adapter';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule, { bufferLogs: false });
  const config = app.get(ConfigService);

  app.enableCors({
    origin: config.get<string>('cors.origin')?.split(',') ?? '*',
    credentials: true,
  });

  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Wire Socket.IO with the Redis adapter so multiple API instances
  // can broadcast across the same set of clients (horizontal scaling).
  const ioAdapter = new RedisIoAdapter(app);
  await ioAdapter.connectToRedis(config.get<string>('redis.url')!);
  app.useWebSocketAdapter(ioAdapter);

  const swagger = new DocumentBuilder()
    .setTitle('DerinSplit API')
    .setDescription('Real-time perfume marketplace OS')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const doc = SwaggerModule.createDocument(app, swagger);
  SwaggerModule.setup('docs', app, doc);

  const port = config.get<number>('port') ?? 4000;
  await app.listen(port, '0.0.0.0');
  logger.log(`🚀 DerinSplit API ready on :${port}`);
  logger.log(`📡 WebSocket gateway:    ws://0.0.0.0:${port}`);
  logger.log(`📘 OpenAPI docs:         http://0.0.0.0:${port}/docs`);
}

bootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Fatal bootstrap error', err);
  process.exit(1);
});
