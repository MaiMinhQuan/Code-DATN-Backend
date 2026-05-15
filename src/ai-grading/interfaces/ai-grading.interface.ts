// Interface cho các dịch vụ chấm điểm AI.
import { databaseProviders } from "@/database/database.providers";
import { AIResultDto } from "../dto/ai-result.dto";


export interface IAIGradingService {
  /*
  Chấm điểm bài viết IELTS Task 2.
  Input:
  - essayContent: Nội dung bài viết của học viên.
  - questionPrompt: Đề thi tương ứng.
  Output:
  - AIResultDto: Kết quả chấm điểm chi tiết gồm band score, lỗi sai và nhận xét.
  */
  gradeEssay(essayContent: string, questionPrompt: string): Promise<AIResultDto>;

  /*
  Kiểm tra xem provider đã được cấu hình và có thể kết nối hay chưa.
  Output:
  - boolean: true nếu có API key hợp lệ và sẵn sàng nhận yêu cầu.
  */
  isAvailable(): Promise<boolean>;

  /*
  Trả về ID của provider (ví dụ: "GEMINI").
  Dùng để ghi log và chuyển đổi provider trong khi chạy.
  */
  getProviderName(): string;
}

export const AI_GRADING_SERVICE = "AI_GRADING_SERVICE";
