import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
} from "@nestjs/common";
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
    @Query("page", new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query("limit", new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return this.adminService.getUserSubmissions(userId, page, limit);
  }

  /*
  GET /admin/submissions/:submissionId — chi tiết một bài nộp (ADMIN only).
  */
  @Get("submissions/:submissionId")
  async getSubmissionDetail(@Param("submissionId") submissionId: string) {
    return this.adminService.getSubmissionDetail(submissionId);
  }
}
