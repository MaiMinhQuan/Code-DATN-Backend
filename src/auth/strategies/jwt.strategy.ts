import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { ConfigService } from "@nestjs/config";
import { AuthService } from "../auth.service";

// Tự động verify token và gọi validate()
// Được JwtAuthGuard sử dụng để xác thực request
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private authService: AuthService,
  ) {
    // Cấu hình Passport JWT
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>("JWT_SECRET") || "your_jwt_secret_key_change_in_production",
    });
  }

  // Được Passport gọi tự động sau khi verify token thành công
  // Tham số: payload - Decoded JWT payload {sub: userId, email, role}
  // Trả về: User object được inject vào request.user
  async validate(payload: any) {
    const user = await this.authService.validateUser(payload.sub);
    if (!user) {
      throw new UnauthorizedException("Token không hợp lệ");
    }
    return user;
  }
}
