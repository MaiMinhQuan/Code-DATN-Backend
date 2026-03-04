import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { UserRole } from "@/common/enums";
import { ROLES_KEY } from "../decorators/roles.decorator";

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Lấy roles required từ decorator @Roles()
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Nếu không có @Roles() decorator -> cho phép truy cập
    if (!requiredRoles) {
      return true;
    }

    // Lấy user từ request (đã được set bởi JwtAuthGuard)
    const {user} = context.switchToHttp().getRequest();

    // Kiểm tra user có role phù hợp không
    const hasRole = requiredRoles.includes(user.role);
    if (!hasRole) {
      throw new ForbiddenException("Bạn không có quyền truy cập vào tài nguyên này");
    }

    return true;
  }
}
