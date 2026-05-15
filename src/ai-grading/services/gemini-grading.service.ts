// Implement IAIGradingService cho Gemini 2.5 Flash.
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { IAIGradingService } from "../interfaces/ai-grading.interface";
import { AIResultDto } from "../dto/ai-result.dto";
import { AIErrorDto } from "../dto/ai-error.dto";
import { buildGradingPrompt } from "../prompts/grading-prompt";
import { ErrorCategory } from "../../common/enums";

// Gọi Gemini API, xử lý kết quả JSON và chuyển đổi sang định dạng AIResultDto.
@Injectable()
export class GeminiGradingService implements IAIGradingService {
  private readonly logger = new Logger(GeminiGradingService.name);
  private genAI: GoogleGenerativeAI;
  private model: any;

  /*
  Khởi tạo client Gemini nếu có API key trong config.
  configService: Dịch vụ cấu hình NestJS để đọc biến môi trường.
  */
  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>("ai.gemini.apiKey");
    if (apiKey) {
      this.genAI = new GoogleGenerativeAI(apiKey);
      this.model = this.genAI.getGenerativeModel({ model: "models/gemini-2.5-flash" });
    }
  }

  // Trả về ID của provider (ví dụ: "GEMINI").
  getProviderName(): string {
    return "GEMINI";
  }

  /*
  Kiểm tra xem client Gemini đã được khởi tạo và có API key hay chưa.
  Output:
  - boolean: true khi model đã sẵn sàng nhận yêu cầu.
  */
  async isAvailable(): Promise<boolean> {
    const apiKey = this.configService.get<string>("ai.gemini.apiKey");
    return !!apiKey && !!this.model;
  }

  /*
  Gửi bài viết và đề thi đến Gemini và trả về kết quả chấm điểm.
  Input:
  - essayContent: Nội dung bài viết của học viên.
  - questionPrompt: Đề thi IELTS Task 2 tương ứng.
  Output:
  - AIResultDto: Kết quả chấm điểm chi tiết gồm band score, lỗi sai và nhận xét.
  */
  async gradeEssay(essayContent: string, questionPrompt: string): Promise<AIResultDto> {
    if (!(await this.isAvailable())) {
      throw new Error("Gemini API is not configured");
    }

    try {
      const prompt = buildGradingPrompt(questionPrompt, essayContent);
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      return this.parseGeminiResponse(text, essayContent);
    } catch (error) {
      this.logger.error(`Gemini grading error: ${error.message}`, error.stack);
      throw new Error(`AI grading failed: ${error.message}`);
    }
  }

  /*
  Parse phản hồi thô từ Gemini thành AIResultDto.
  Input:
  - responseText: Chuỗi thô trả về từ model Gemini.
  - essayContent: Bài viết gốc để xác định chính xác vị trí lỗi.
  Output:
  - AIResultDto: Kết quả chấm điểm chi tiết gồm band score, lỗi sai và nhận xét.
  */
  private parseGeminiResponse(responseText: string, essayContent: string): AIResultDto {
    try {
      let jsonString = responseText;

      // Tách JSON từ khối code ```json ... ``` nếu có, để tránh bị text giải thích xen vào
      const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        jsonString = jsonMatch[1];
      } else {
        // Fallback: lấy đoạn JSON đầu tiên được tìm thấy trong phản hồi nếu không có khối code markdown
        const objectMatch = responseText.match(/\{[\s\S]*\}/);
        if (objectMatch) {
          jsonString = objectMatch[0];
        }
      }

      // Làm sạch chuỗi JSON để xử lý các vấn đề định dạng thường gặp của Gemini
      jsonString = this.cleanJsonString(jsonString);
      const parsed = JSON.parse(jsonString);

      const taskResponseScore = this.validateScore(parsed.taskResponseScore);
      const coherenceScore = this.validateScore(parsed.coherenceScore);
      const lexicalScore = this.validateScore(parsed.lexicalScore);
      const grammarScore = this.validateScore(parsed.grammarScore);

      let overallBand = this.validateScore(parsed.overallBand);
      // Tính lại overall band từ 4 điểm thành phần nếu model trả về 0 hoặc giá trị không hợp lệ
      if (overallBand === 0) {
        overallBand = this.calculateOverallBand(taskResponseScore, coherenceScore, lexicalScore, grammarScore);
      }

      const errors = this.parseErrors(parsed.errors || [], essayContent);

      return {
        taskResponseScore,
        coherenceScore,
        lexicalScore,
        grammarScore,
        overallBand,
        errors,
        generalFeedback: parsed.generalFeedback || "Không có nhận xét",
        strengths: parsed.strengths || "",
        improvements: parsed.improvements || "",
        processedAt: new Date(),
      };
    } catch (error) {
      this.logger.error(`Thất bại khi xử lý phản hồi Gemini: ${error.message}`);
      this.logger.debug(`Response text: ${responseText}`);
      // Nếu JSON.parse thất bại, cố gắng trích xuất dữ liệu bằng regex
      return this.extractDataWithRegex(responseText, essayContent);
    }
  }

  /*
  Xóa các ký tự gây lỗi cho JSON.parse khi Gemini bao gồm dấu ngoặc kép tiếng Việt.
  Bỏ nội dung thừa sau dấu ngoặc đóng cuối cùng.
  jsonString: Chuỗi JSON thô cần làm sạch.
  */
  private cleanJsonString(jsonString: string): string {
    let cleaned = jsonString;

    // Thay thế các cặp dấu ngoặc kép trong chuỗi JSON để tránh lỗi parse
    cleaned = cleaned.replace(/" hoặc "/g, ' hoặc ');
    cleaned = cleaned.replace(/" or "/g, ' or ');
    cleaned = cleaned.replace(/"([^"]*)" hoặc "([^"]*)"/g, '$1 hoặc $2');

    // Walk brace counts to find the last valid closing brace and truncate there
    let braceCount = 0;
    let lastValidIndex = 0;

    for (let i = 0; i < cleaned.length; i++) {
      if (cleaned[i] === '{') braceCount++;
      if (cleaned[i] === '}') {
        braceCount--;
        if (braceCount === 0) {
          lastValidIndex = i + 1;
          break;
        }
      }
    }

    if (lastValidIndex > 0) {
      cleaned = cleaned.substring(0, lastValidIndex);
    }

    return cleaned;
  }

  /**
   * Regex-based fallback parser used when JSON.parse fails on the model's response.
   * Extracts individual score fields and error objects via targeted regex patterns.
   * @param responseText - Raw Gemini response text.
   * @param essayContent - Original essay for resolving error character positions.
   */
  private extractDataWithRegex(responseText: string, essayContent: string): AIResultDto {
    this.logger.log("Attempting to extract data with regex...");

    const taskResponseScore = this.extractScore(responseText, "taskResponseScore");
    const coherenceScore = this.extractScore(responseText, "coherenceScore");
    const lexicalScore = this.extractScore(responseText, "lexicalScore");
    const grammarScore = this.extractScore(responseText, "grammarScore");
    let overallBand = this.extractScore(responseText, "overallBand");

    // Recalculate overall band from components if model omitted it or returned 0
    if (overallBand === 0 && (taskResponseScore > 0 || coherenceScore > 0)) {
      overallBand = this.calculateOverallBand(taskResponseScore, coherenceScore, lexicalScore, grammarScore);
    }

    const generalFeedback = this.extractTextField(responseText, "generalFeedback") || "Không có nhận xét";
    const strengths = this.extractTextField(responseText, "strengths") || "";
    const improvements = this.extractTextField(responseText, "improvements") || "";
    const errors = this.extractErrorsWithRegex(responseText, essayContent);

    this.logger.log(`Regex extraction successful. Overall band: ${overallBand}`);

    return {
      taskResponseScore,
      coherenceScore,
      lexicalScore,
      grammarScore,
      overallBand,
      errors,
      generalFeedback,
      strengths,
      improvements,
      processedAt: new Date(),
    };
  }

  /**
   * Extract a numeric score for a named field using a simple key:value regex.
   * @param text - Source text to search.
   * @param fieldName - JSON key name to look for (e.g., "taskResponseScore").
   * @returns Validated score (0–9, 0.5 step), or 0 if not found.
   */
  private extractScore(text: string, fieldName: string): number {
    const regex = new RegExp(`"${fieldName}"\\s*:\\s*([\\d.]+)`, "i");
    const match = text.match(regex);
    if (match) {
      return this.validateScore(parseFloat(match[1]));
    }
    return 0;
  }

  /**
   * Extract a quoted string value for a named JSON field via regex.
   * @param text - Source text to search.
   * @param fieldName - JSON key name to look for.
   * @returns The extracted string value, or `null` if not found.
   */
  private extractTextField(text: string, fieldName: string): string | null {
    const regex = new RegExp(`"${fieldName}"\\s*:\\s*"([^"]*(?:\\\\.[^"]*)*)"`, "i");
    const match = text.match(regex);
    if (match) {
      // Unescape common escape sequences Gemini may embed in string values
      return match[1].replace(/\\n/g, "\n").replace(/\\"/g, '"');
    }
    return null;
  }

  /**
   * Parse individual error objects from the `errors` array using regex when JSON.parse fails.
   * Resolves character indices against essayContent when originalText is available.
   * @param text - Source response text containing the errors array.
   * @param essayContent - Original essay to verify and correct error positions.
   */
  private extractErrorsWithRegex(text: string, essayContent: string): AIErrorDto[] {
    const errors: AIErrorDto[] = [];
    const errorsMatch = text.match(/"errors"\s*:\s*\[([\s\S]*?)\]/);
    if (!errorsMatch) return errors;

    const errorsContent = errorsMatch[1];
    const errorObjects = errorsContent.match(/\{[^{}]*\}/g);
    if (!errorObjects) return errors;

    for (const errorStr of errorObjects) {
      try {
        let cleanedError = errorStr
          .replace(/" hoặc "/g, ' hoặc ')
          .replace(/" or "/g, ' or ');

        const errorObj = JSON.parse(cleanedError);
        const category = this.validateErrorCategory(errorObj.category);
        let startIndex = Number(errorObj.startIndex) || 0;
        let endIndex = Number(errorObj.endIndex) || 0;

        // Re-derive indices from originalText for accuracy when AI indices are off
        if (errorObj.originalText) {
          const foundIndex = essayContent.indexOf(errorObj.originalText);
          if (foundIndex !== -1) {
            startIndex = foundIndex;
            endIndex = foundIndex + errorObj.originalText.length;
          }
        }

        // Clamp indices to valid bounds of the essay string
        startIndex = Math.max(0, Math.min(startIndex, essayContent.length));
        endIndex = Math.max(startIndex, Math.min(endIndex, essayContent.length));

        if (startIndex < endIndex) {
          errors.push({
            startIndex,
            endIndex,
            category,
            originalText: errorObj.originalText || essayContent.substring(startIndex, endIndex),
            suggestion: (errorObj.suggestion || "").replace(/" hoặc "/g, ' hoặc '),
            explanation: errorObj.explanation || "Không có giải thích",
            severity: this.validateSeverity(errorObj.severity),
          });
        }
      } catch (e) {
        this.logger.debug(`Failed to parse error object: ${errorStr}`);
      }
    }

    return errors;
  }

  /**
   * Validate a raw score value and round it to the nearest 0.5 IELTS band step.
   * @param score - Raw value from the AI response.
   * @returns Clamped and rounded score in [0, 9], or 0 for invalid input.
   */
  private validateScore(score: any): number {
    const num = Number(score);
    if (isNaN(num) || num < 0 || num > 9) {
      return 0;
    }
    return Math.round(num * 2) / 2; // Round to nearest 0.5
  }

  /**
   * Calculate the overall IELTS band as the mean of the four criteria, rounded to 0.5.
   * @param tr - Task Response score.
   * @param cc - Coherence & Cohesion score.
   * @param lr - Lexical Resource score.
   * @param gra - Grammatical Range & Accuracy score.
   */
  private calculateOverallBand(tr: number, cc: number, lr: number, gra: number): number {
    const avg = (tr + cc + lr + gra) / 4;
    return Math.round(avg * 2) / 2;
  }

  /**
   * Parse a raw errors array from the AI JSON response into validated AIErrorDto objects.
   * Drops entries where startIndex >= endIndex (invalid range).
   * @param errors - Raw array parsed from AI JSON.
   * @param essayContent - Original essay for resolving/verifying character positions.
   */
  private parseErrors(errors: any[], essayContent: string): AIErrorDto[] {
    if (!Array.isArray(errors)) return [];

    return errors
      .map((error) => {
        const category = this.validateErrorCategory(error.category);
        let startIndex = Number(error.startIndex) || 0;
        let endIndex = Number(error.endIndex) || 0;

        // Prefer locating the error by originalText for better accuracy
        if (error.originalText && typeof error.originalText === "string") {
          const foundIndex = essayContent.indexOf(error.originalText);
          if (foundIndex !== -1) {
            startIndex = foundIndex;
            endIndex = foundIndex + error.originalText.length;
          }
        }

        // Clamp to valid range
        startIndex = Math.max(0, Math.min(startIndex, essayContent.length));
        endIndex = Math.max(startIndex, Math.min(endIndex, essayContent.length));

        return {
          startIndex,
          endIndex,
          category,
          originalText: error.originalText || essayContent.substring(startIndex, endIndex),
          suggestion: error.suggestion || "",
          explanation: error.explanation || "Không có giải thích",
          severity: this.validateSeverity(error.severity),
        };
      })
      .filter((error) => error.startIndex < error.endIndex); // Remove zero-length or inverted ranges
  }

  /**
   * Normalise an error category string to a valid ErrorCategory enum value.
   * Defaults to GRAMMAR for unrecognised values.
   * @param category - Raw category string from the AI response.
   */
  private validateErrorCategory(category: string): ErrorCategory {
    const validCategories: ErrorCategory[] = [
      ErrorCategory.GRAMMAR,
      ErrorCategory.VOCABULARY,
      ErrorCategory.COHERENCE,
      ErrorCategory.TASK_RESPONSE,
      ErrorCategory.SPELLING,
      ErrorCategory.PUNCTUATION,
    ];

    const upperCategory = String(category).toUpperCase() as ErrorCategory;
    if (validCategories.includes(upperCategory)) {
      return upperCategory;
    }
    return ErrorCategory.GRAMMAR; // Default fallback
  }

  /**
   * Normalise a severity string to one of the three valid levels.
   * Defaults to "medium" for unrecognised values.
   * @param severity - Raw severity string from the AI response.
   */
  private validateSeverity(severity: string): "low" | "medium" | "high" {
    const validSeverities = ["low", "medium", "high"];
    const lowerSeverity = String(severity).toLowerCase();
    if (validSeverities.includes(lowerSeverity)) {
      return lowerSeverity as "low" | "medium" | "high";
    }
    return "medium"; // Default fallback
  }

  /** Return a zero-score AIResultDto used when all parsing strategies fail. */
  private getDefaultResult(): AIResultDto {
    return {
      taskResponseScore: 0,
      coherenceScore: 0,
      lexicalScore: 0,
      grammarScore: 0,
      overallBand: 0,
      errors: [],
      generalFeedback: "Không thể chấm bài. Vui lòng thử lại sau.",
      strengths: "",
      improvements: "",
      processedAt: new Date(),
    };
  }
}
