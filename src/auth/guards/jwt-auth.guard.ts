import { Injectable, ExecutionContext, UnauthorizedException } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { Observable } from "rxjs";

// Guard xác thực JWT token cho protected routes
// VD: @UseGuards(JwtAuthGuard)
@Injectable()
export class JwtAuthGuard extends AuthGuard("jwt") {
  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    // Kích hoạt JwtStrategy để verify token
    return super.canActivate(context);
  }

  // Custom error message khi unauthorized
  handRequest(err: any, user: any, info: any) {
    if (err || !user) {
      throw err || new UnauthorizedException("Vui lòng đăng nhập để tiếp tục");
    }
    return user;
  }
}
