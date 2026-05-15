// Guard JWT (HTTP): verify Bearer token qua JwtStrategy.
import { Injectable, ExecutionContext, UnauthorizedException } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { Observable } from "rxjs";

@Injectable()
export class JwtAuthGuard extends AuthGuard("jwt") {
  /*
  Nest guard: kích hoạt verify token (delegate sang Passport/JwtStrategy)
  Input:
    - context — ExecutionContext
   */
  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    return super.canActivate(context);
  }

  /*
  Custom handler khi passport không auth được
  Input:
    - err — lỗi từ strategy
    - user — user đã validate
    - info — thông tin thêm từ passport
   */
  handRequest(err: any, user: any, info: any) {
    if (err || !user) {
      throw err || new UnauthorizedException("Vui lòng đăng nhập để tiếp tục");
    }
    return user;
  }
}
