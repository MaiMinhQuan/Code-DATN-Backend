// Decorator @CurrentUser() — lấy request.user (hoặc một field) từ JwtAuthGuard.
import { createParamDecorator, ExecutionContext } from "@nestjs/common";

export const CurrentUser = createParamDecorator(
  /*
  Lấy user hoặc field từ request.user
  Input:
    - data — tên field cần lấy (optional)
    - ctx — ExecutionContext
   */
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      return null;
    }

    if (data) {
      // Chuẩn hóa các alias của trường ID thành chuỗi thuần
      if (data === "userId" || data === "_id" || data === "sub") {
        return user._id?.toString() || user.sub;
      }
      return user[data];
    }

    return user;
  },
);
