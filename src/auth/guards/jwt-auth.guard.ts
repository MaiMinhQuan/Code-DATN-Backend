import { Injectable, ExecutionContext, UnauthorizedException } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { Observable } from "rxjs";

@Injectable()
export class JwtAuthGuard extends AuthGuard("jwt") {
  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    // Gọi logic từ passport JWT strategy
    return super.canActivate(context);
  }

  handRequest(err: any, user: any, info: any) {
    // Nếu không có user hoặc có lỗi
    if (err || !user) {
      throw err || new UnauthorizedException("Vui lòng đăng nhập để tiếp tục");
    }
    return user;
  }
}
