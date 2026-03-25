import { createParamDecorator, ExecutionContext } from "@nestjs/common";

// Decorator lấy thông tin user từ request (sau khi qua JwtAuthGuard)

// Lấy toàn bộ user object
// getUserProfile(@CurrentUser() user: UserPayload)

// Lấy userId dạng string
// createNote(@CurrentUser("userId") userId: string)


export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      return null;
    }

    // Nếu cần field cụ thể
    if (data) {
      // Xử lý cho userId/_id
      if (data === "userId" || data === "_id" || data === "sub") {
        return user._id?.toString() || user.sub;
      }
      return user[data];
    }

    return user;
  },
);
