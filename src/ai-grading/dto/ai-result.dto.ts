import { AIErrorDto } from "./ai-error.dto";

export class AIResultDto {
  taskResponseScore: number; // 0-9
  coherenceScore: number; // 0-9
  lexicalScore: number; // 0-9
  grammarScore: number; // 0-9
  overallBand: number; // 0-9
  errors: AIErrorDto[];
  generalFeedback: string;
  strengths: string;
  improvements: string;
  processedAt: Date;
}
