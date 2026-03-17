import { Module, Global } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SubmissionsGateway } from './gateways/submissions.gateway';
import { WsJwtGuard } from './guards/ws-jwt.guard';

@Global() // Để các module khác có thể inject SubmissionsGateway
@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: '7d',
        } ,
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [
    SubmissionsGateway,
    WsJwtGuard,
  ],
  exports: [
    SubmissionsGateway, // Export để SubmissionProcessor có thể inject
  ],
})
export class WebsocketModule {}
