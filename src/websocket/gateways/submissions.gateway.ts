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

// WebSocket Gateway xử lý real-time notifications cho Submissions
// Namespace: /ws/submissions
// Auto-join room theo userId khi connect
// Emit events: submission_status_updated, submission_progress
@WebSocketGateway({
  namespace: WS_NAMESPACES.SUBMISSIONS,
  cors: {
    origin: "*", // Sẽ được override bởi adapter
    credentials: true,
  },
})
export class SubmissionsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(SubmissionsGateway.name);

  @WebSocketServer()
  server: Server;

  // Map để track connected users
  private connectedUsers: Map<string, Set<string>> = new Map(); // userId -> Set<socketId>

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  // Lifecycle: Sau khi Gateway khởi tạo
  afterInit(server: Server) {
    this.logger.log(`WebSocket Gateway initialized on namespace: ${WS_NAMESPACES.SUBMISSIONS}`);
  }

  // Lifecycle: Khi client kết nối
  async handleConnection(client: Socket) {
    try {
      // 1. Xác thực token
      const user = await this.authenticateSocket(client);

      if (!user) {
        this.logger.warn(`Connection rejected - Invalid token: ${client.id}`);
        client.emit(WS_EVENTS.ERROR, { message: "Authentication failed" });
        client.disconnect();
        return;
      }

      // 2. Gắn user info vào socket
      (client as SocketWithUser).user = user;

      // 3. Auto join room theo userId
      const userRoom = `${ROOM_PREFIX.USER}${user.userId}`;
      client.join(userRoom);

      // 4. Track connected user
      this.trackUserConnection(user.userId, client.id);

      // 5. Gửi confirmation
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

  // Lifecycle: Khi client ngắt kết nối
  handleDisconnect(client: Socket) {
    const user = (client as SocketWithUser).user;

    if (user) {
      this.untrackUserConnection(user.userId, client.id);
      this.logger.log(`Client disconnected: ${client.id} | User: ${user.email}`);
    } else {
      this.logger.log(`Client disconnected: ${client.id} (unauthenticated)`);
    }
  }

  // Event handler: Client yêu cầu join room cụ thể
  @SubscribeMessage(WS_EVENTS.JOIN_ROOM)
  handleJoinRoom(
    @ConnectedSocket() client: SocketWithUser,
    @MessageBody() data: { room: string },
  ) {
    const { room } = data;

    // Validate room name (chỉ cho phép join room của chính mình)
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

  // Event handler: Client yêu cầu rời room
  @SubscribeMessage(WS_EVENTS.LEAVE_ROOM)
  handleLeaveRoom(
    @ConnectedSocket() client: SocketWithUser,
    @MessageBody() data: { room: string },
  ) {
    const { room } = data;

    // Không cho phép rời room mặc định của user
    const userRoom = `${ROOM_PREFIX.USER}${client.user.userId}`;
    if (room === userRoom) {
      return { success: false, message: "Cannot leave default user room" };
    }

    client.leave(room);
    this.logger.debug(`Client ${client.id} left room: ${room}`);

    return { success: true, room };
  }

  // ============ PUBLIC METHODS FOR EMITTING EVENTS ============

  // Emit event khi submission status thay đổi
  // Được gọi từ SubmissionProcessor
  emitSubmissionStatusUpdated(userId: string, payload: SubmissionStatusPayload): void {
    const room = `${ROOM_PREFIX.USER}${userId}`;

    this.server.to(room).emit(WS_EVENTS.SUBMISSION_STATUS_UPDATED, payload);

    this.logger.log(
      `Emitted ${WS_EVENTS.SUBMISSION_STATUS_UPDATED} to room ${room} | ` +
      `Submission: ${payload.submissionId} | Status: ${payload.status}`
    );
  }

  // Emit event khi có progress update
  emitSubmissionProgress(userId: string, payload: SubmissionProgressPayload): void {
    const room = `${ROOM_PREFIX.USER}${userId}`;

    this.server.to(room).emit(WS_EVENTS.SUBMISSION_PROGRESS, payload);

    this.logger.debug(
      `Emitted ${WS_EVENTS.SUBMISSION_PROGRESS} to room ${room} | ` +
      `Progress: ${payload.progress}%`
    );
  }

  // Helper: Kiểm tra user có đang online không
  isUserOnline(userId: string): boolean {
    return this.connectedUsers.has(userId) &&
           this.connectedUsers.get(userId)!.size > 0;
  }

  // Helper: Lấy số lượng connections của user
  getUserConnectionCount(userId: string): number {
    return this.connectedUsers.get(userId)?.size || 0;
  }

  // Helper: Lấy tổng số connections
  getTotalConnections(): number {
    let total = 0;
    this.connectedUsers.forEach(sockets => {
      total += sockets.size;
    });
    return total;
  }

  // ============ PRIVATE HELPER METHODS ============

  // Xác thực socket từ token
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

  // Trích xuất token từ socket handshake
  private extractToken(client: Socket): string | null {
    // 1. Query param
    const tokenFromQuery = client.handshake.query.token as string;
    if (tokenFromQuery) return tokenFromQuery;

    // 2. Auth object
    const tokenFromAuth = client.handshake.auth?.token as string;
    if (tokenFromAuth) return tokenFromAuth;

    // 3. Authorization header
    const authHeader = client.handshake.headers.authorization;
    if (authHeader?.startsWith("Bearer ")) {
      return authHeader.substring(7);
    }

    return null;
  }

  // Theo dõi kết nối của user
  private trackUserConnection(userId: string, socketId: string): void {
    if (!this.connectedUsers.has(userId)) {
      this.connectedUsers.set(userId, new Set());
    }
    this.connectedUsers.get(userId)!.add(socketId);
  }

  // Ngừng theo dõi kết nối của user khi ngắt kết nối
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
