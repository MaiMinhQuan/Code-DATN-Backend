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

  async isAvailable(): Promise<boolean> {
    const apiKey = this.configService.get<string>("ai.gemini.apiKey");
    return !!apiKey && !!this.model;
  }

  async gradeEssay(essayContent: string, questionPrompt: string): Promise<AIResultDto> {
    if (!(await this.isAvailable())) {
      throw new Error("Gemini API is not configured");
    }

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

  private parseGeminiResponse(responseText: string, essayContent: string): AIResultDto {
    try {
      let jsonString = responseText;

      const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        jsonString = jsonMatch[1];
      } else {
        const objectMatch = responseText.match(/\{[\s\S]*\}/);
        if (objectMatch) {
          jsonString = objectMatch[0];
        }
      }

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
      this.logger.error(`Failed to parse Gemini response: ${error.message}`);
      this.logger.debug(`Response text: ${responseText}`);
      return this.extractDataWithRegex(responseText, essayContent);
    }
  }

  private cleanJsonString(jsonString: string): string {
    let cleaned = jsonString;

    // Fix unescaped quotes trong suggestion
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

    if (lastValidIndex > 0) {
      cleaned = cleaned.substring(0, lastValidIndex);
    }

    return cleaned;
  }

  private extractDataWithRegex(responseText: string, essayContent: string): AIResultDto {
    this.logger.log("Attempting to extract data with regex...");

    const taskResponseScore = this.extractScore(responseText, "taskResponseScore");
    const coherenceScore = this.extractScore(responseText, "coherenceScore");
    const lexicalScore = this.extractScore(responseText, "lexicalScore");
    const grammarScore = this.extractScore(responseText, "grammarScore");
    let overallBand = this.extractScore(responseText, "overallBand");

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

  private extractScore(text: string, fieldName: string): number {
    const regex = new RegExp(`"${fieldName}"\\s*:\\s*([\\d.]+)`, "i");
    const match = text.match(regex);
    if (match) {
      return this.validateScore(parseFloat(match[1]));
    }
    return 0;
  }

  private extractTextField(text: string, fieldName: string): string | null {
    const regex = new RegExp(`"${fieldName}"\\s*:\\s*"([^"]*(?:\\\\.[^"]*)*)"`, "i");
    const match = text.match(regex);
    if (match) {
      return match[1].replace(/\\n/g, "\n").replace(/\\"/g, '"');
    }
    return null;
  }

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

        if (errorObj.originalText) {
          const foundIndex = essayContent.indexOf(errorObj.originalText);
          if (foundIndex !== -1) {
            startIndex = foundIndex;
            endIndex = foundIndex + errorObj.originalText.length;
          }
        }

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

  private validateScore(score: any): number {
    const num = Number(score);
    if (isNaN(num) || num < 0 || num > 9) {
      return 0;
    }
    return Math.round(num * 2) / 2;
  }

  private calculateOverallBand(tr: number, cc: number, lr: number, gra: number): number {
    const avg = (tr + cc + lr + gra) / 4;
    return Math.round(avg * 2) / 2;
  }

  private parseErrors(errors: any[], essayContent: string): AIErrorDto[] {
    if (!Array.isArray(errors)) return [];

    return errors
      .map((error) => {
        const category = this.validateErrorCategory(error.category);
        let startIndex = Number(error.startIndex) || 0;
        let endIndex = Number(error.endIndex) || 0;

        if (error.originalText && typeof error.originalText === "string") {
          const foundIndex = essayContent.indexOf(error.originalText);
          if (foundIndex !== -1) {
            startIndex = foundIndex;
            endIndex = foundIndex + error.originalText.length;
          }
        }

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
      .filter((error) => error.startIndex < error.endIndex);
  }

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
    return ErrorCategory.GRAMMAR;
  }

  private validateSeverity(severity: string): "low" | "medium" | "high" {
    const validSeverities = ["low", "medium", "high"];
    const lowerSeverity = String(severity).toLowerCase();
    if (validSeverities.includes(lowerSeverity)) {
      return lowerSeverity as "low" | "medium" | "high";
    }
    return "medium";
  }

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
