import { Controller, Post, Body, Get, UseGuards } from "@nestjs/common";
import { IsString, IsNotEmpty } from "class-validator"; // 👈 Thêm import
import { AIGradingService } from "./ai-grading.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { UserRole } from "../common/enums";

// DTO cho test - Thêm validation decorators
class TestGradingDto {
  @IsString({ message: "essayContent phải là chuỗi" })
  @IsNotEmpty({ message: "essayContent không được để trống" })
  essayContent: string;

  @IsString({ message: "questionPrompt phải là chuỗi" })
  @IsNotEmpty({ message: "questionPrompt không được để trống" })
  questionPrompt: string;
}

@Controller("ai-grading")
export class AIGradingController {
  constructor(private readonly aiGradingService: AIGradingService) {}

  // GET /api/ai-grading/status
  // Kiểm tra trạng thái các AI providers
  @Get("status")
  async getStatus() {
    const currentProvider = this.aiGradingService.getCurrentProvider();
    const providersStatus = await this.aiGradingService.getProvidersStatus();

    return {
      currentProvider,
      providers: providersStatus,
    };
  }

  // POST /api/ai-grading/test
  // Test chấm bài (Admin - để tránh spam API)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post("test")
  async testGrading(@Body() testDto: TestGradingDto) {
    const startTime = Date.now();

    const result = await this.aiGradingService.gradeEssay(
      testDto.essayContent,
      testDto.questionPrompt,
    );

    const processingTime = Date.now() - startTime;

    return {
      success: true,
      processingTimeMs: processingTime,
      provider: this.aiGradingService.getCurrentProvider(),
      result,
    };
  }
}
