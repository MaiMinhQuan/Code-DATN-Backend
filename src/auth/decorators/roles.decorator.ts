// Decorator @Roles() — gắn metadata role để RolesGuard check.
import { SetMetadata } from "@nestjs/common";
import { UserRole } from "@/common/enums";

export const ROLES_KEY = "roles";

export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
