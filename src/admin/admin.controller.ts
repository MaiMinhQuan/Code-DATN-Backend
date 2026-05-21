import { Controller, Get, Param, Query, UseGuards, ParseIntPipe } from "@nestjs/common";
import { AdminService } from "./admin.service";
import { JwtAuthGuard } from "@/auth/guards/jwt-auth.guard";
import { RolesGuard } from "@/auth/guards/roles.guard";
import { Roles } from "@/auth/decorators/roles.decorator";
import { UserRole } from "@/common/enums";

@Controller("admin")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  /*
  GET /admin/stats — thống kê tổng quan hệ thống (ADMIN only).
  */
  @Get("stats")
  async getStats() {
    return this.adminService.getStats();
  }

  /*
  GET /admin/users/:userId/submissions — submissions của một user (ADMIN only).
  Input:
    - userId — id của user cần xem submissions
    - page, limit — phân trang (optional)
  */
  @Get("users/:userId/submissions")
  async getUserSubmissions(
    @Param("userId") userId: string,
    @Query("page", new ParseIntPipe({ optional: true })) page?: number,
    @Query("limit", new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    return this.adminService.getUserSubmissions(userId, page, limit);
  }
}
