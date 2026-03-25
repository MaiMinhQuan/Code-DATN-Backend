import { AIResultDto } from "../dto/ai-result.dto";

// Strategy Interface - Tất cả AI providers phải implement interface này
export interface IAIGradingService {

  // Chấm bài viết IELTS Writing Task 2
  // essayContent: Bài viết của học viên
  // questionPrompt: Đề thi
  gradeEssay(essayContent: string, questionPrompt: string): Promise<AIResultDto>;

  // Kiểm tra service có sẵn sàng không
  isAvailable(): Promise<boolean>;


  // Lấy tên provider (do đang thử nhiều model khác nhau)
  getProviderName(): string;
}

export const AI_GRADING_SERVICE = "AI_GRADING_SERVICE";
