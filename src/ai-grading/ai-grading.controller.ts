// Controller xử lý các endpoint về chấm điểm AI
import { Controller, Post, Body, Get, UseGuards } from "@nestjs/common";
import { IsString, IsNotEmpty } from "class-validator";
import { AIGradingService } from "./ai-grading.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { UserRole } from "../common/enums";

// DTO cho endpoint test chấm điểm, chỉ chứa nội dung bài viết và đề bài.
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

  /*
  GET /ai-grading/status
  Trả về AI đang hoạt động và tình trạng sẵn sàng của tất cả nhà cung cấp đã cấu hình.
  */
  @Get("status")
  async getStatus() {
    const currentProvider = this.aiGradingService.getCurrentProvider();
    const providersStatus = await this.aiGradingService.getProvidersStatus();

    return {
      currentProvider,
      providers: providersStatus,
    };
  }

  /*
  POST /ai-grading/test
  Gọi AI chấm điểm và trả về kết quả
  Input:
  - testDto: Dữ liệu chứa essayContent và questionPrompt.
  Output:
  - success: true nếu chấm điểm thành công.
  - processingTimeMs: Thời gian xử lý chấm điểm (ms).
  - provider: Tên provider đã chấm điểm.
  - result: Kết quả chấm điểm chi tiết gồm band score, lỗi sai và nhận xét.
  */
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
