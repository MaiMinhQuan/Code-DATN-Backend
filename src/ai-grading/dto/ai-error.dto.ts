import { ErrorCategory } from "../../common/enums";

// DTO cho AI Error - Lỗi được AI phát hiện trong bài viết
export class AIErrorDto {
  startIndex: number;
  endIndex: number;
  category: ErrorCategory;
  originalText: string;
  suggestion: string;
  explanation: string;
  severity: "low" | "medium" | "high";
}
