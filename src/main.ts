// import { NestFactory } from "@nestjs/core";
// import { ValidationPipe } from "@nestjs/common";
// import { AppModule } from "./app.module";

// async function bootstrap() {
//   const app = await NestFactory.create(AppModule);

//   // Global validation pipe
//   app.useGlobalPipes(
//     new ValidationPipe({
//       whitelist: true,
//       forbidNonWhitelisted: true,
//       transform: true,
//     }),
//   );

//   // CORS configuration
//   app.enableCors({
//     origin: process.env.CORS_ORIGIN || "http://localhost:3001",
//     credentials: true,
//   });

//   // API prefix
//   app.setGlobalPrefix("api");

//   const port = process.env.PORT || 3000;
//   await app.listen(port);

//   console.log(`Application is running on: http://localhost:${port}`);
//   console.log(`API Documentation: http://localhost:${port}/api`);
// }

// bootstrap();

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { SocketIOAdapter } from './websocket/adapters/socket-io.adapter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT') || 3000;
  const corsOrigin = configService.get<string>('CORS_ORIGIN') || 'http://localhost:3001';

  app.setGlobalPrefix("api");

  // CORS
  app.enableCors({
    origin: corsOrigin.split(',').map(origin => origin.trim()),
    credentials: true,
  });

  // Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // WebSocket Adapter (Optional - dùng nếu cần custom CORS)
  app.useWebSocketAdapter(new SocketIOAdapter(app, configService));

  await app.listen(port);
  console.log(`Server running on http://localhost:${port}`);
  console.log(`WebSocket available at ws://localhost:${port}/ws/submissions`);
}
bootstrap();
