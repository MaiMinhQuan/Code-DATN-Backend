import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { UserRole } from "@/common/enums";
import { ROLES_KEY } from "../decorators/roles.decorator";

// Guard kiểm tra quyền truy cập dựa trên role
// VD: @UseGuards(JwtAuthGuard, RolesGuard) + @Roles(UserRole.ADMIN)
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Đọc metadata @Roles từ route handler hoặc controller
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Nếu route không có @Roles decorator -> cho phép truy cập
    if (!requiredRoles) {
      return true;
    }

    const {user} = context.switchToHttp().getRequest();

    const hasRole = requiredRoles.includes(user.role);
    if (!hasRole) {
      throw new ForbiddenException("Bạn không có quyền truy cập vào tài nguyên này");
    }

    return true;
  }
}
