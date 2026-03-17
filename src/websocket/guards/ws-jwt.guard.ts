import { CanActivate, ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class WsJwtGuard implements CanActivate {
  private readonly logger = new Logger(WsJwtGuard.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      const client: Socket = context.switchToWs().getClient();
      const token = this.extractTokenFromSocket(client);

      if (!token) {
        throw new WsException('Token không được cung cấp');
      }

      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });

      // Gắn user info vào socket để sử dụng sau
      (client as any).user = {
        userId: payload.sub,
        email: payload.email,
        role: payload.role,
      };

      this.logger.debug(`WebSocket authenticated: ${payload.email}`);
      return true;

    } catch (error) {
      this.logger.error(`WebSocket auth failed: ${error.message}`);
      throw new WsException('Token không hợp lệ hoặc đã hết hạn');
    }
  }

  /**
   * Trích xuất token từ socket handshake
   * Hỗ trợ nhiều cách gửi token:
   * 1. Query param: ?token=xxx
   * 2. Auth header: { auth: { token: 'xxx' } }
   * 3. Bearer header: { headers: { authorization: 'Bearer xxx' } }
   */
  private extractTokenFromSocket(client: Socket): string | null {
    // 1. Từ query param
    const tokenFromQuery = client.handshake.query.token as string;
    if (tokenFromQuery) {
      return tokenFromQuery;
    }

    // 2. Từ auth object
    const tokenFromAuth = client.handshake.auth?.token as string;
    if (tokenFromAuth) {
      return tokenFromAuth;
    }

    // 3. Từ Authorization header
    const authHeader = client.handshake.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    return null;
  }
}
