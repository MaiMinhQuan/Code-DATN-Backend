import { IoAdapter } from '@nestjs/platform-socket.io';
import { INestApplication, Logger } from '@nestjs/common';
import { ServerOptions } from 'socket.io';
import { ConfigService } from '@nestjs/config';

export class SocketIOAdapter extends IoAdapter {
  private readonly logger = new Logger(SocketIOAdapter.name);

  constructor(
    app: INestApplication,
    private readonly configService: ConfigService,
  ) {
    super(app);
  }

  createIOServer(port: number, options?: ServerOptions): any {
    const corsOrigin = this.configService.get<string>('CORS_ORIGIN') || 'http://localhost:3001';

    const serverOptions: ServerOptions = {
      ...options,
      cors: {
        origin: corsOrigin.split(',').map(origin => origin.trim()),
        methods: ['GET', 'POST'],
        credentials: true,
      },
      // Ping/Pong settings
      pingTimeout: 60000,
      pingInterval: 25000,
      // Transport settings
      transports: ['websocket', 'polling'],
      // Allow EIO3 clients (older socket.io clients)
      allowEIO3: true,
    };

    this.logger.log(`WebSocket server configured with CORS: ${corsOrigin}`);

    const server = super.createIOServer(port, serverOptions);
    return server;
  }
}
