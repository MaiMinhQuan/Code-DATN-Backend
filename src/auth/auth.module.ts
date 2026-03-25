import { Module } from "@nestjs/common";
import { JwtModule, JwtModuleOptions } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { DatabaseModule } from "@/database/database.module";
import { AuthService } from "./auth.service";
import { AuthController } from "./auth.controller";
import { JwtStrategy } from "./strategies/jwt.strategy";

// Module xử lý authentication - JWT + Passport
@Module({
  imports: [
    DatabaseModule,
    PassportModule,
    // Cấu hình JWT async để đọc secret từ env
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService): Promise<JwtModuleOptions> => ({
        secret: configService.get<string>("JWT_SECRET") || "your_jwt_secret_key_change_in_production",
        signOptions: {
          expiresIn: (configService.get<string>("JWT_EXPIRES_IN") || "7d") as any,
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
