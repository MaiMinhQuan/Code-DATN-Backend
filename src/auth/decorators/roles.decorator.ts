import { SetMetadata } from "@nestjs/common";
import { UserRole } from "@/common/enums";

// Decorator phân quyền
// Sử dụng kết hợp với RolesGuard để kiểm soát truy cập

// VD: @Roles(UserRole.ADMIN)

export const ROLES_KEY = "roles";
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
