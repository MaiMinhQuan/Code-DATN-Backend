// IoAdapter tùy chỉnh: CORS, ping/pong, transport cho Socket.IO
import { IoAdapter } from "@nestjs/platform-socket.io";
import { INestApplication, Logger } from "@nestjs/common";
import { ServerOptions } from "socket.io";
import { ConfigService } from "@nestjs/config";

export class SocketIOAdapter extends IoAdapter {
  private readonly logger = new Logger(SocketIOAdapter.name);

  /*
  Gắn Nest app và ConfigService để đọc biến môi trường
  Input:
    - app — instance NestJS
    - configService — đọc CORS_ORIGIN và cấu hình khác
   */
  constructor(
    app: INestApplication,
    private readonly configService: ConfigService,
  ) {
    super(app);
  }

  /*
  Tạo Socket.IO server với CORS, ping timeout/interval và transport
  Input:
    - port — cổng lắng nghe
    - options — ServerOptions gốc từ Nest
   */
  createIOServer(port: number, options?: ServerOptions): any {
    const corsOrigin = this.configService.get<string>("CORS_ORIGIN") || "http://localhost:3001";

    const serverOptions: ServerOptions = {
      ...options,
      cors: {
        // Chuỗi nhiều origin (phân tách dấu phẩy) -> mảng cho CORS
        origin: corsOrigin.split(",").map(origin => origin.trim()),
        methods: ["GET", "POST"],
        credentials: true, // Cho phép cookie khi cross-origin
      },
      pingTimeout: 60000, // Ngắt client nếu ~60s không nhận pong
      pingInterval: 25000, // Gửi ping định kỳ để phát hiện kết nối chết
      transports: ["websocket", "polling"], // Ưu tiên WS, fallback long-polling
      allowEIO3: true, // Tương thích client Socket.IO v2 (EIO3)
    };

    this.logger.log(`WebSocket server configured with CORS: ${corsOrigin}`);

    return super.createIOServer(port, serverOptions);
  }
}
