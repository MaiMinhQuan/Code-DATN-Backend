// DTO phần error của bài essay
import { ErrorCategory } from "../../common/enums";

export class AIErrorDto {
  startIndex: number;
  endIndex: number;
  category: ErrorCategory;
  originalText: string;
  suggestion: string;
  explanation: string;
  severity: "low" | "medium" | "high";
}
