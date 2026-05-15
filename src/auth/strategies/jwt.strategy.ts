// Passport JWT strategy: verify token và gán request.user
import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { ConfigService } from "@nestjs/config";
import { AuthService } from "../auth.service";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private authService: AuthService,
  ) {
    // Lấy token từ Authorization: Bearer <token>
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>("JWT_SECRET") || "your_jwt_secret_key_change_in_production",
    });
  }

  /*
  Passport gọi sau khi verify token: load user từ DB và check active
  Input:
    - payload — payload JWT (sub/email/role)
   */
  async validate(payload: any) {
    const user = await this.authService.validateUser(payload.sub);
    if (!user) {
      throw new UnauthorizedException("Token không hợp lệ");
    }
    return user;
  }
}
