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

  // Đặt tiền tố toàn cục cho tất cả route REST API
  app.setGlobalPrefix("api");

  // Cho phép các origin được cấu hình qua biến môi trường CORS_ORIGIN
  app.enableCors({
    origin: corsOrigin.split(',').map(origin => origin.trim()),
    credentials: true,
  });

  // Pipe xác thực dữ liệu đầu vào toàn cục — tự động chuyển kiểu và loại bỏ trường không khai báo
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

  // Adapter tùy chỉnh cho WebSocket — ghi đè cấu hình CORS mặc định
  app.useWebSocketAdapter(new SocketIOAdapter(app, configService));

  await app.listen(port);
  console.log(`Server đang chạy tại http://localhost:${port}`);
  console.log(`WebSocket khả dụng tại ws://localhost:${port}/ws/submissions`);
}
bootstrap();
