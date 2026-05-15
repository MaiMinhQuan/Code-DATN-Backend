import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { JwtAuthGuard } from "@/auth/guards/jwt-auth.guard";
import { RolesGuard } from "@/auth/guards/roles.guard";
import { Roles } from "@/auth/decorators/roles.decorator";
import { CurrentUser } from "@/auth/decorators/current-user.decorator";
import { UserRole } from "@/common/enums";
import { SubmissionsService } from "./submissions.service";
import { CreateSubmissionDto, UpdateSubmissionDto, QuerySubmissionDto } from "./dto";

@Controller("submissions")
@UseGuards(JwtAuthGuard, RolesGuard)
export class SubmissionsController {
  constructor(private readonly submissionsService: SubmissionsService) {}

  /*
  POST /submissions — tạo submission mới ở trạng thái DRAFT
  Input:
    - userId — id user từ JWT
    - createDto — body request
   */
  @Post()
  @Roles(UserRole.STUDENT, UserRole.ADMIN)
  async create(
    @CurrentUser("userId") userId: string,
    @Body() createDto: CreateSubmissionDto,
  ) {
    const submission = await this.submissionsService.create(userId, createDto);
    return {
      message: "Submission created successfully",
      data: submission,
    };
  }

  /*
  POST /submissions/:id/submit — đưa submission vào queue để chấm AI (async, trả 202)
  Input:
    - submissionId — id submission trên URL
    - userId — id user từ JWT
   */
  @Post(":id/submit")
  @Roles(UserRole.STUDENT, UserRole.ADMIN)
  @HttpCode(HttpStatus.ACCEPTED) // 202 — xử lý bất đồng bộ
  async submitForGrading(
    @Param("id") submissionId: string,
    @CurrentUser("userId") userId: string,
  ) {
    const result = await this.submissionsService.submitForGrading(submissionId, userId);
    return {
      statusCode: HttpStatus.ACCEPTED,
      message: result.message,
      data: {
        submissionId,
        jobId: result.jobId,
        note: "Dùng WebSocket hoặc polling GET /api/submissions/:id để kiểm tra trạng thái chấm bài",
      },
    };
  }

  /*
  GET /submissions — danh sách submission của user hiện tại (phân trang)
  Input:
    - userId — id user từ JWT
    - queryDto — query filter/pagination
   */
  @Get()
  @Roles(UserRole.STUDENT, UserRole.ADMIN)
  async findAll(
    @CurrentUser("userId") userId: string,
    @Query() queryDto: QuerySubmissionDto,
  ) {
    const result = await this.submissionsService.findByUser(userId, queryDto);
    return {
      message: "Submissions retrieved successfully",
      ...result,
    };
  }

  // GET /submissions/queue-status — thống kê BullMQ queue (admin)
  @Get("queue-status")
  @Roles(UserRole.ADMIN)
  async getQueueStatus() {
    const status = await this.submissionsService.getQueueStatus();
    return {
      message: "Queue status retrieved",
      data: status,
    };
  }

  /*
  GET /submissions/:id — chi tiết submission + kết quả AI (nếu có)
  Input:
    - submissionId — id submission trên URL
    - userId — id user từ JWT (chỉ chủ sở hữu xem được)
   */
  @Get(":id")
  @Roles(UserRole.STUDENT, UserRole.ADMIN)
  async findOne(
    @Param("id") submissionId: string,
    @CurrentUser("userId") userId: string,
  ) {
    const submission = await this.submissionsService.findOne(submissionId, userId);
    return {
      message: "Submission retrieved successfully",
      data: submission,
    };
  }

  /*
  PATCH /submissions/:id — cập nhật draft (chỉ khi status = DRAFT)
  Input:
    - submissionId — id submission trên URL
    - userId — id user từ JWT (chỉ chủ sở hữu sửa được)
    - updateDto — body request
   */
  @Patch(":id")
  @Roles(UserRole.STUDENT, UserRole.ADMIN)
  async updateDraft(
    @Param("id") submissionId: string,
    @CurrentUser("userId") userId: string,
    @Body() updateDto: UpdateSubmissionDto,
  ) {
    const submission = await this.submissionsService.updateDraft(submissionId, userId, updateDto);
    return {
      message: "Draft updated successfully",
      data: submission,
    };
  }

  /*
  DELETE /submissions/:id — xóa vĩnh viễn draft (204)
  Input:
    - submissionId — id submission trên URL
    - userId — id user từ JWT (chỉ chủ sở hữu xóa được)
   */
  @Delete(":id")
  @Roles(UserRole.STUDENT, UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT) // 204
  async deleteDraft(
    @Param("id") submissionId: string,
    @CurrentUser("userId") userId: string,
  ) {
    await this.submissionsService.deleteDraft(submissionId, userId);
  }
}
