import 'dotenv/config';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

let appRef: INestApplication | undefined;
let isInitialized = false;

async function createApp(): Promise<INestApplication> {
  if (!appRef) {
    appRef = await NestFactory.create(AppModule);
    appRef.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
  }
  return appRef;
}

async function initApp(): Promise<INestApplication> {
  const app = await createApp();
  if (!isInitialized) {
    await app.init();
    isInitialized = true;
  }
  return app;
}

async function bootstrap() {
  const app = await initApp();
  await app.listen(process.env.PORT ?? 3000);
}

if (!process.env.VERCEL) {
  bootstrap();
}

export default async function handler(req: unknown, res: unknown) {
  const app = await initApp();
  const instance = app.getHttpAdapter().getInstance();
  return instance(req, res);
}
