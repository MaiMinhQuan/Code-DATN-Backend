// import { createParamDecorator, ExecutionContext } from '@nestjs/common';

// export const CurrentUser = createParamDecorator(
//   (data: unknown, ctx: ExecutionContext) => {
//     const request = ctx.switchToHttp().getRequest();
//     return request.user;
//   },
// );

// import { createParamDecorator, ExecutionContext } from '@nestjs/common';

// export const CurrentUser = createParamDecorator(
//   (data: string | undefined, ctx: ExecutionContext) => {
//     const request = ctx.switchToHttp().getRequest();
//     const user = request.user;

//     // Nếu có chỉ định field cụ thể (vd: 'userId', '_id', 'email')
//     if (data) {
//       // Xử lý trường hợp đặc biệt cho userId
//       if (data === 'userId' || data === '_id') {
//         return user?._id?.toString();
//       }
//       return user?.[data];
//     }

//     // Nếu không có data, trả về toàn bộ user
//     return user;
//   },
// );

import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      return null;
    }

    // Nếu yêu cầu field cụ thể
    if (data) {
      // Xử lý đặc biệt cho userId/_id -> trả về string
      if (data === 'userId' || data === '_id' || data === 'sub') {
        return user._id?.toString() || user.sub;
      }
      return user[data];
    }

    // Không có data -> trả về toàn bộ user
    return user;
  },
);
