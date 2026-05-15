// Guard Roles: check role theo metadata @Roles().
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { UserRole } from "@/common/enums";
import { ROLES_KEY } from "../decorators/roles.decorator";

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  /*
  Check role user có nằm trong requiredRoles không
  Input:
    - context — ExecutionContext
   */
  canActivate(context: ExecutionContext): boolean {
    // Read roles attached by @Roles() from the handler then the controller (handler wins)
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // No @Roles decorator present — route is accessible to any authenticated user
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
