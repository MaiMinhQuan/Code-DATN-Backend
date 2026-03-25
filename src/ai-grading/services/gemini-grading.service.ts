import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { IAIGradingService } from "../interfaces/ai-grading.interface";
import { AIResultDto } from "../dto/ai-result.dto";
import { AIErrorDto } from "../dto/ai-error.dto";
import { buildGradingPrompt } from "../prompts/grading-prompt";
import { ErrorCategory } from "../../common/enums";

@Injectable()
export class GeminiGradingService implements IAIGradingService {
  private readonly logger = new Logger(GeminiGradingService.name);
  private genAI: GoogleGenerativeAI;
  private model: any;

  // Khởi tạo Gemini service nếu có API key
  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>("ai.gemini.apiKey");
    if (apiKey) {
      this.genAI = new GoogleGenerativeAI(apiKey);
      this.model = this.genAI.getGenerativeModel({ model: "models/gemini-2.5-flash" });
    }
  }

  getProviderName(): string {
    return "GEMINI";
  }

  // Kiểm tra Gemini service có sẵn sàng không
  async isAvailable(): Promise<boolean> {
    const apiKey = this.configService.get<string>("ai.gemini.apiKey");
    return !!apiKey && !!this.model;
  }

  // Chấm bài viết của học viên
  // essayContent: Bài viết của học viên
  // questionPrompt: Đề thi
  async gradeEssay(essayContent: string, questionPrompt: string): Promise<AIResultDto> {
    // Kiểm tra nếu service không sẵn sàng thì trả về lỗi ngay
    if (!(await this.isAvailable())) {
      throw new Error("Gemini API is not configured");
    }

    // Chấm bài với Gemini và xử lý kết quả
    try {
      const prompt = buildGradingPrompt(questionPrompt, essayContent);
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      const aiResult = this.parseGeminiResponse(text, essayContent);
      return aiResult;
    } catch (error) {
      this.logger.error(`Gemini grading error: ${error.message}`, error.stack);
      throw new Error(`AI grading failed: ${error.message}`);
    }
  }

  // Xử lý phản hồi từ Gemini, trích xuất điểm số và lỗi
  private parseGeminiResponse(responseText: string, essayContent: string): AIResultDto {
    try {
      let jsonString = responseText;

      // Trích xuất JSON từ response
      const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        jsonString = jsonMatch[1];
      } else {
        const objectMatch = responseText.match(/\{[\s\S]*\}/);
        if (objectMatch) {
          jsonString = objectMatch[0];
        }
      }

      // Làm sạch JSON string để tránh lỗi khi parse
      jsonString = this.cleanJsonString(jsonString);
      const parsed = JSON.parse(jsonString);

      const taskResponseScore = this.validateScore(parsed.taskResponseScore);
      const coherenceScore = this.validateScore(parsed.coherenceScore);
      const lexicalScore = this.validateScore(parsed.lexicalScore);
      const grammarScore = this.validateScore(parsed.grammarScore);

      let overallBand = this.validateScore(parsed.overallBand);
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
      // Dùng regex trích xuất thủ công nếu JSON parsing thất bại
      return this.extractDataWithRegex(responseText, essayContent);
    }
  }

  // Làm sạch JSON string trước khi parse (xử lý format lỗi từ Gemini)
  private cleanJsonString(jsonString: string): string {
    let cleaned = jsonString;

    // Loại bỏ các ký tự không mong muốn
    cleaned = cleaned.replace(/" hoặc "/g, ' hoặc ');
    cleaned = cleaned.replace(/" or "/g, ' or ');
    cleaned = cleaned.replace(/"([^"]*)" hoặc "([^"]*)"/g, '$1 hoặc $2');

    // Tìm vị trí đóng cuối cùng của object
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

    // Cắt chuỗi đến vị trí đóng cuối cùng nếu có
    if (lastValidIndex > 0) {
      cleaned = cleaned.substring(0, lastValidIndex);
    }

    return cleaned;
  }

  // Nếu parsing JSON thất bại, dùng regex để trích xuất dữ liệu thô từ response
  private extractDataWithRegex(responseText: string, essayContent: string): AIResultDto {
    this.logger.log("Attempting to extract data with regex...");

    const taskResponseScore = this.extractScore(responseText, "taskResponseScore");
    const coherenceScore = this.extractScore(responseText, "coherenceScore");
    const lexicalScore = this.extractScore(responseText, "lexicalScore");
    const grammarScore = this.extractScore(responseText, "grammarScore");
    let overallBand = this.extractScore(responseText, "overallBand");

    // Tính overallBand từ 4 điểm nếu AI không trả về hoặc trả về 0
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

  // Trích xuất điểm số từ response text bằng regex
  private extractScore(text: string, fieldName: string): number {
    const regex = new RegExp(`"${fieldName}"\\s*:\\s*([\\d.]+)`, "i");
    const match = text.match(regex);
    if (match) {
      return this.validateScore(parseFloat(match[1]));
    }
    return 0;
  }

  // Trích xuất trường text từ response bằng regex
  private extractTextField(text: string, fieldName: string): string | null {
    const regex = new RegExp(`"${fieldName}"\\s*:\\s*"([^"]*(?:\\\\.[^"]*)*)"`, "i");
    const match = text.match(regex);
    if (match) {
      // Xử lý escape characters (\n, \") trong string
      return match[1].replace(/\\n/g, "\n").replace(/\\"/g, '"');
    }
    return null;
  }

  // Trích xuất danh sách lỗi từ response text bằng regex
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

        // Tìm vị trí chính xác của lỗi trong bài viết bằng originalText
        if (errorObj.originalText) {
          const foundIndex = essayContent.indexOf(errorObj.originalText);
          if (foundIndex !== -1) {
            startIndex = foundIndex;
            endIndex = foundIndex + errorObj.originalText.length;
          }
        }

        // Đảm bảo indices nằm trong giới hạn hợp lệ của essayContent
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

  // Validate và làm tròn điểm số IELTS (0-9, bước nhảy 0.5)
  private validateScore(score: any): number {
    const num = Number(score);
    if (isNaN(num) || num < 0 || num > 9) {
      return 0;
    }
    // Làm tròn đến bội số 0.5 gần nhất (5.0, 5.5, 6.0, 6.5, ...)
    return Math.round(num * 2) / 2;
  }

  // Tính điểm overallBand dựa trên 4 điểm thành phần nếu overallBand không được cung cấp
  private calculateOverallBand(tr: number, cc: number, lr: number, gra: number): number {
    const avg = (tr + cc + lr + gra) / 4;
    return Math.round(avg * 2) / 2;
  }

  // Parse danh sách lỗi từ JSON đã được parse
  private parseErrors(errors: any[], essayContent: string): AIErrorDto[] {
    if (!Array.isArray(errors)) return [];

    return errors
      .map((error) => {
        const category = this.validateErrorCategory(error.category);
        let startIndex = Number(error.startIndex) || 0;
        let endIndex = Number(error.endIndex) || 0;

        // Tìm vị trí chính xác của lỗi trong bài viết bằng originalText
        if (error.originalText && typeof error.originalText === "string") {
          const foundIndex = essayContent.indexOf(error.originalText);
          if (foundIndex !== -1) {
            startIndex = foundIndex;
            endIndex = foundIndex + error.originalText.length;
          }
        }

        // Đảm bảo indices nằm trong giới hạn hợp lệ của essayContent
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
      // Chỉ giữ lại các lỗi có vị trí hợp lệ (startIndex < endIndex)
      .filter((error) => error.startIndex < error.endIndex);
  }

  // Validate và chuẩn hóa error category
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
    // Mặc định về GRAMMAR nếu category không hợp lệ
    return ErrorCategory.GRAMMAR;
  }

  // Validate và chuẩn hóa severity level
  private validateSeverity(severity: string): "low" | "medium" | "high" {
    const validSeverities = ["low", "medium", "high"];
    const lowerSeverity = String(severity).toLowerCase();
    if (validSeverities.includes(lowerSeverity)) {
      return lowerSeverity as "low" | "medium" | "high";
    }
    // Mặc định về medium nếu severity không hợp lệ
    return "medium";
  }

  // Trả về kết quả mặc định nếu quá trình xử lý thất bại
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
