// Module WebSocket
import { Module, Global } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { SubmissionsGateway } from "./gateways/submissions.gateway";
import { WsJwtGuard } from "./guards/ws-jwt.guard";

@Global()
@Module({
  imports: [
    // JWT cùng secret với HTTP guard
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>("JWT_SECRET"),
        signOptions: {
          expiresIn: "7d",
        },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [
    SubmissionsGateway,
    WsJwtGuard,
  ],
  exports: [
    SubmissionsGateway, // Cho SubmissionProcessor inject để emit event
  ],
})
export class WebsocketModule {}
