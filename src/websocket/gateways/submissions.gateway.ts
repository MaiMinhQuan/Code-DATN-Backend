// Gateway Socket.IO namespace /ws/submissions
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from "@nestjs/websockets";
import { Logger, UseGuards } from "@nestjs/common";
import { Server, Socket } from "socket.io";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { WS_EVENTS, WS_NAMESPACES, ROOM_PREFIX } from "../dto/ws-events.dto";
import {
  SocketWithUser,
  SubmissionStatusPayload,
  SubmissionProgressPayload,
} from "../interfaces/socket-with-user.interface";

// CORS ở đây có thể bị adapter ghi đè phần origin; credentials bật cho cookie nếu cần
@WebSocketGateway({
  namespace: WS_NAMESPACES.SUBMISSIONS,
  cors: {
    origin: "*",
    credentials: true,
  },
})
export class SubmissionsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(SubmissionsGateway.name);

  @WebSocketServer()
  server: Server;

  // userId -> tập socketId (nhiều tab / thiết bị)
  private connectedUsers: Map<string, Set<string>> = new Map();

  /*
  Inject JwtService + ConfigService để verify token khi client kết nối
  Input:
    - jwtService — verify JWT handshake
    - configService — đọc JWT_SECRET
   */
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  /*
  Sau khi server Socket.IO khởi tạo xong
  Input:
    - server — instance Socket.IO Server
   */
  afterInit(server: Server) {
    this.logger.log(`WebSocket Gateway initialized on namespace: ${WS_NAMESPACES.SUBMISSIONS}`);
  }

  /*
  Client mới: xác thực JWT, gán user lên socket, join room user:<id>
  Input:
    - client — socket vừa kết nối
   */
  async handleConnection(client: Socket) {
    try {
      const user = await this.authenticateSocket(client);

      if (!user) {
        this.logger.warn(`Connection rejected - Invalid token: ${client.id}`);
        client.emit(WS_EVENTS.ERROR, { message: "Authentication failed" });
        client.disconnect();
        return;
      }

      // Gắn payload user đã verify để handler sau dùng
      (client as SocketWithUser).user = user;

      // Tự join room riêng để server emit đúng chủ submission
      const userRoom = `${ROOM_PREFIX.USER}${user.userId}`;
      client.join(userRoom);

      this.trackUserConnection(user.userId, client.id);

      client.emit(WS_EVENTS.CONNECTED, {
        message: "Connected successfully",
        userId: user.userId,
        room: userRoom,
        socketId: client.id,
        timestamp: new Date(),
      });

      this.logger.log(`Client connected: ${client.id} | User: ${user.email} | Room: ${userRoom}`);

    } catch (error) {
      this.logger.error(`Connection error: ${error.message}`);
      client.emit(WS_EVENTS.ERROR, { message: "Connection failed" });
      client.disconnect();
    }
  }

  /*
  Client ngắt kết nối: bỏ track socket
  Input:
    - client — socket đang disconnect
   */
  handleDisconnect(client: Socket) {
    const user = (client as SocketWithUser).user;

    if (user) {
      this.untrackUserConnection(user.userId, client.id);
      this.logger.log(`Client disconnected: ${client.id} | User: ${user.email}`);
    } else {
      this.logger.log(`Client disconnected: ${client.id} (unauthenticated)`);
    }
  }

  /*
  Client gửi join_room: join thêm room (không cho join room user của người khác)
  Input:
    - client — socket đã auth
    - data — { room: string }
   */
  @SubscribeMessage(WS_EVENTS.JOIN_ROOM)
  handleJoinRoom(
    @ConnectedSocket() client: SocketWithUser,
    @MessageBody() data: { room: string },
  ) {
    const { room } = data;

    // Chặn subscribe room private user:<id> của user khác
    if (room.startsWith(ROOM_PREFIX.USER)) {
      const roomUserId = room.replace(ROOM_PREFIX.USER, "");
      if (roomUserId !== client.user.userId) {
        return { success: false, message: "Cannot join other user room" };
      }
    }

    client.join(room);
    this.logger.debug(`Client ${client.id} joined room: ${room}`);

    return { success: true, room };
  }

  /*
  Client gửi leave_room: rời room (không cho rời room mặc định user:<id>)
  Input:
    - client — socket đã auth
    - data — { room: string }
   */
  @SubscribeMessage(WS_EVENTS.LEAVE_ROOM)
  handleLeaveRoom(
    @ConnectedSocket() client: SocketWithUser,
    @MessageBody() data: { room: string },
  ) {
    const { room } = data;

    // Giữ user trong room mặc định để luôn nhận event chấm bài
    const userRoom = `${ROOM_PREFIX.USER}${client.user.userId}`;
    if (room === userRoom) {
      return { success: false, message: "Cannot leave default user room" };
    }

    client.leave(room);
    this.logger.debug(`Client ${client.id} left room: ${room}`);

    return { success: true, room };
  }

  /*
  Emit submission_status_updated tới room của chủ bài (processor gọi)
  Input:
    - userId — chủ submission
    - payload — submissionId, status, hasResult, ...
   */
  emitSubmissionStatusUpdated(userId: string, payload: SubmissionStatusPayload): void {
    const room = `${ROOM_PREFIX.USER}${userId}`;

    this.server.to(room).emit(WS_EVENTS.SUBMISSION_STATUS_UPDATED, payload);

    this.logger.log(
      `Emitted ${WS_EVENTS.SUBMISSION_STATUS_UPDATED} to room ${room} | ` +
      `Submission: ${payload.submissionId} | Status: ${payload.status}`
    );
  }

  /*
  Emit submission_progress (tiến trình chấm) tới room chủ bài
  Input:
    - userId — chủ submission
    - payload — progress %, message, ...
   */
  emitSubmissionProgress(userId: string, payload: SubmissionProgressPayload): void {
    const room = `${ROOM_PREFIX.USER}${userId}`;

    this.server.to(room).emit(WS_EVENTS.SUBMISSION_PROGRESS, payload);

    this.logger.debug(
      `Emitted ${WS_EVENTS.SUBMISSION_PROGRESS} to room ${room} | ` +
      `Progress: ${payload.progress}%`
    );
  }

  /*
  Kiểm tra user còn ít nhất một socket đang mở
  Input:
    - userId — id user
   */
  isUserOnline(userId: string): boolean {
    return this.connectedUsers.has(userId) &&
           this.connectedUsers.get(userId)!.size > 0;
  }

  /*
  Số socket đang active của một user (đa tab)
  Input:
    - userId — id user
   */
  getUserConnectionCount(userId: string): number {
    return this.connectedUsers.get(userId)?.size || 0;
  }

  /*
  Tổng số socket đang kết nối (mọi user)
  Input:
    - (không có tham số)
   */
  getTotalConnections(): number {
    let total = 0;
    this.connectedUsers.forEach(sockets => {
      total += sockets.size;
    });
    return total;
  }

  /*
  Đọc JWT từ handshake, verify và trả claims user (hoặc null)
  Input:
    - client — socket kết nối
   */
  private async authenticateSocket(client: Socket): Promise<{
    userId: string;
    email: string;
    role: string;
  } | null> {
    try {
      const token = this.extractToken(client);

      if (!token) {
        return null;
      }

      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get<string>("JWT_SECRET"),
      });

      return {
        userId: payload.sub,
        email: payload.email,
        role: payload.role,
      };

    } catch (error) {
      this.logger.debug(`Token verification failed: ${error.message}`);
      return null;
    }
  }

  /*
  Lấy token từ query ?token= -> auth.token -> Authorization Bearer
  Input:
    - client — socket (handshake)
   */
  private extractToken(client: Socket): string | null {
    const tokenFromQuery = client.handshake.query.token as string;
    if (tokenFromQuery) return tokenFromQuery;

    const tokenFromAuth = client.handshake.auth?.token as string;
    if (tokenFromAuth) return tokenFromAuth;

    const authHeader = client.handshake.headers.authorization;
    if (authHeader?.startsWith("Bearer ")) {
      return authHeader.substring(7);
    }

    return null;
  }

  /*
  Thêm socketId vào map theo userId
  Input:
    - userId — chủ socket
    - socketId — id socket.io
   */
  private trackUserConnection(userId: string, socketId: string): void {
    if (!this.connectedUsers.has(userId)) {
      this.connectedUsers.set(userId, new Set());
    }
    this.connectedUsers.get(userId)!.add(socketId);
  }

  /*
  Xóa socketId khỏi map; xóa hẳn key user nếu không còn socket
  Input:
    - userId — chủ socket
    - socketId — id socket cần gỡ
   */
  private untrackUserConnection(userId: string, socketId: string): void {
    const userSockets = this.connectedUsers.get(userId);
    if (userSockets) {
      userSockets.delete(socketId);
      if (userSockets.size === 0) {
        this.connectedUsers.delete(userId);
      }
    }
  }
}
