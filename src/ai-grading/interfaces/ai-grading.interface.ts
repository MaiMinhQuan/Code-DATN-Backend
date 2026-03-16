import { AIResultDto } from "../dto/ai-result.dto";

// Strategy Interface - Tất cả AI providers phải implement interface này
export interface IAIGradingService {
  /**
   * Chấm bài viết IELTS Writing Task 2
   * @param essayContent - Nội dung bài viết của học viên
   * @param questionPrompt - Đề bài IELTS
   * @returns AIResultDto - Kết quả chấm bài
   */
  gradeEssay(essayContent: string, questionPrompt: string): Promise<AIResultDto>;

  /**
   * Kiểm tra service có sẵn sàng không
   * @returns boolean
   */
  isAvailable(): Promise<boolean>;

  /**
   * Tên provider
   */
  getProviderName(): string;
}

// Token để inject service
export const AI_GRADING_SERVICE = "AI_GRADING_SERVICE";
