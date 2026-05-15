// DTO kết quả chấm AI chi tiết cho bài IELTS Writing Task 2.
import { AIErrorDto } from "./ai-error.dto";

export class AIResultDto {
  taskResponseScore: number;
  coherenceScore: number;
  lexicalScore: number;
  grammarScore: number;
  overallBand: number;
  errors: AIErrorDto[];
  generalFeedback: string;
  strengths: string;
  improvements: string;
  processedAt: Date;
}
