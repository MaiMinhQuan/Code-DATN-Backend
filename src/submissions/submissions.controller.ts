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


  // POST /api/submissions
  // Tạo bài nộp mới (DRAFT)
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


  // POST /api/submissions/:id/submit
  // Nộp bài để AI chấm
  @Post(":id/submit")
  @Roles(UserRole.STUDENT, UserRole.ADMIN)
  @HttpCode(HttpStatus.ACCEPTED) // 202
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
        note: "Use WebSocket or poll GET /api/submissions/:id to check grading status",
      },
    };
  }


  // GET /api/submissions
  // Lấy danh sách bài nộp của user hiện tại
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


  // GET /api/submissions/queue-status
  // Lấy trạng thái Queue (Admin)
  @Get("queue-status")
  @Roles(UserRole.ADMIN)
  async getQueueStatus() {
    const status = await this.submissionsService.getQueueStatus();
    return {
      message: "Queue status retrieved",
      data: status,
    };
  }


  // GET /api/submissions/:id
  // Lấy chi tiết 1 bài nộp (bao gồm aiResult nếu đã chấm xong)
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

  // PATCH /api/submissions/:id
  // Cập nhật bài nháp (chỉ khi status = DRAFT)
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


  // DELETE /api/submissions/:id
  // Xóa bài nháp (chỉ khi status = DRAFT)
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
