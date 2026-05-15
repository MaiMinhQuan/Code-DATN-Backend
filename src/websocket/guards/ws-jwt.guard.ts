// Guard WebSocket: verify JWT từ handshake, gán user lên socket
import { CanActivate, ExecutionContext, Injectable, Logger } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { WsException } from "@nestjs/websockets";
import { Socket } from "socket.io";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class WsJwtGuard implements CanActivate {
  private readonly logger = new Logger(WsJwtGuard.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  /*
  Cho phép kết nối/handler WS nếu token hợp lệ
  Input:
    - context — ExecutionContext (chuyển sang client WS)
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      const client: Socket = context.switchToWs().getClient();
      const token = this.extractTokenFromSocket(client);

      if (!token) {
        throw new WsException("Token không được cung cấp");
      }

      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get<string>("JWT_SECRET"),
      });

      // Gắn user lên socket (handler đọc (client as any).user)
      (client as any).user = {
        userId: payload.sub,
        email: payload.email,
        role: payload.role,
      };

      this.logger.debug(`WebSocket authenticated: ${payload.email}`);
      return true;

    } catch (error) {
      this.logger.error(`WebSocket auth failed: ${error.message}`);
      throw new WsException("Token không hợp lệ hoặc đã hết hạn");
    }
  }

  /*
  Trích token: query ?token= -> handshake.auth.token -> Authorization Bearer
  Input:
    - client — socket.io client
   */
  private extractTokenFromSocket(client: Socket): string | null {
    const tokenFromQuery = client.handshake.query.token as string;
    if (tokenFromQuery) {
      return tokenFromQuery;
    }

    const tokenFromAuth = client.handshake.auth?.token as string;
    if (tokenFromAuth) {
      return tokenFromAuth;
    }

    const authHeader = client.handshake.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      return authHeader.substring(7);
    }

    return null;
  }
}
