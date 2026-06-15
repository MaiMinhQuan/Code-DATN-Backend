// OpenRouter (OpenAI-compatible) grading service.
// Đổi model chấm: thay OPENROUTER_MODEL trong .env, không cần sửa code.
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import OpenAI from "openai";
import { IAIGradingService } from "../interfaces/ai-grading.interface";
import { AIResultDto } from "../dto/ai-result.dto";
import { AIErrorDto } from "../dto/ai-error.dto";
import { buildHFGradingPrompt } from "../prompts/huggingface-grading-prompt";
import { ErrorCategory } from "../../common/enums";

const DEFAULT_MODEL         = "google/gemini-2.5-flash-lite";
const DEFAULT_MAX_TOKENS    = 4096;
const DEFAULT_TIMEOUT_MS    = 120_000;
const OPENROUTER_BASE_URL   = "https://openrouter.ai/api/v1";

@Injectable()
export class OpenRouterGradingService implements IAIGradingService {
  private readonly logger = new Logger(OpenRouterGradingService.name);
  private client: OpenAI | null = null;
  private readonly model: string;
  private readonly maxTokens: number;

  constructor(private configService: ConfigService) {
    const apiKey      = this.configService.get<string>("ai.openrouter.apiKey");
    this.model        = this.configService.get<string>("ai.openrouter.model") || DEFAULT_MODEL;
    this.maxTokens    = this.configService.get<number>("ai.openrouter.maxTokens") || DEFAULT_MAX_TOKENS;
    const timeoutMs   = this.configService.get<number>("ai.openrouter.requestTimeoutMs") || DEFAULT_TIMEOUT_MS;

    if (apiKey) {
      this.client = new OpenAI({
        baseURL:        OPENROUTER_BASE_URL,
        apiKey,
        timeout:        timeoutMs,
        defaultHeaders: {
          "HTTP-Referer": "https://ielts-writing.app",
          "X-Title":      "IELTS Writing Practice",
        },
      });
      this.logger.log(`OpenRouter grading ready — model=${this.model}, maxTokens=${this.maxTokens}`);
    } else {
      this.logger.warn("OPENROUTER_API_KEY not set — OpenRouter provider unavailable");
    }
  }

  getProviderName(): string {
    return "OPENROUTER";
  }

  async isAvailable(): Promise<boolean> {
    return !!this.client;
  }

  async gradeEssay(essayContent: string, questionPrompt: string): Promise<AIResultDto> {
    if (!this.client) {
      throw new Error("OpenRouter is not configured — set OPENROUTER_API_KEY");
    }

    const prompt = buildHFGradingPrompt(questionPrompt, essayContent);

    try {
      const response = await this.client.chat.completions.create({
        model:       this.model,
        messages:    [{ role: "user", content: prompt }],
        temperature: 0,
        max_tokens:  this.maxTokens,
      });

      const text = response.choices[0]?.message?.content ?? "";
      this.logger.debug(`OpenRouter raw response (200 chars): ${text.slice(0, 200)}`);
      return this.parseResponse(text, essayContent);
    } catch (error) {
      this.logger.error(`OpenRouter grading error: ${error.message}`, error.stack);
      throw new Error(`AI grading failed: ${error.message}`);
    }
  }

  // ─── Parsing ─────────────────────────────────────────────────────────────────

  private parseResponse(responseText: string, essayContent: string): AIResultDto {
    try {
      let jsonString = responseText.trim();

      // Loại bỏ markdown fence nếu có
      const fenceMatch = jsonString.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (fenceMatch) {
        jsonString = fenceMatch[1];
      } else {
        const objMatch = jsonString.match(/\{[\s\S]*\}/);
        if (objMatch) jsonString = objMatch[0];
      }

      jsonString = this.cleanJsonString(jsonString);
      const parsed = JSON.parse(jsonString);

      const taskResponseScore = this.validateScore(parsed.tr_band);
      const coherenceScore    = this.validateScore(parsed.cc_band);
      const lexicalScore      = this.validateScore(parsed.lr_band);
      const grammarScore      = this.validateScore(parsed.gra_band);

      const criterionScores = [taskResponseScore, coherenceScore, lexicalScore, grammarScore];
      const overallBand = criterionScores.every((s) => s > 0)
        ? this.calcOverallBand(taskResponseScore, coherenceScore, lexicalScore, grammarScore)
        : this.validateScore(parsed.overall_band);

      return {
        taskResponseScore,
        coherenceScore,
        lexicalScore,
        grammarScore,
        overallBand,
        errors:          this.parseErrors(parsed.errors ?? [], essayContent),
        generalFeedback: parsed.coaching_analysis || "No feedback available",
        strengths:       "",
        improvements:    "",
        processedAt:     new Date(),
      };
    } catch (error) {
      this.logger.error(`Failed to parse OpenRouter response: ${error.message}`);
      this.logger.debug(`Raw response (200 chars): ${responseText.slice(0, 200)}`);
      return this.extractWithRegex(responseText, essayContent);
    }
  }

  private cleanJsonString(s: string): string {
    let braceCount = 0;
    let lastValid  = 0;
    for (let i = 0; i < s.length; i++) {
      if (s[i] === "{") braceCount++;
      if (s[i] === "}") {
        braceCount--;
        if (braceCount === 0) { lastValid = i + 1; break; }
      }
    }
    return lastValid > 0 ? s.substring(0, lastValid) : s;
  }

  private validateScore(score: unknown): number {
    const n = Number(score);
    if (isNaN(n) || n < 1 || n > 9) return 0;
    return Math.round(n * 2) / 2;
  }

  private calcOverallBand(tr: number, cc: number, lr: number, gra: number): number {
    return Math.round(((tr + cc + lr + gra) / 4) * 2) / 2;
  }

  private validateErrorCategory(cat: string): ErrorCategory {
    const valid: ErrorCategory[] = [
      ErrorCategory.GRAMMAR, ErrorCategory.VOCABULARY, ErrorCategory.COHERENCE,
      ErrorCategory.TASK_RESPONSE, ErrorCategory.SPELLING, ErrorCategory.PUNCTUATION,
    ];
    const upper = String(cat || "").toUpperCase() as ErrorCategory;
    return valid.includes(upper) ? upper : ErrorCategory.GRAMMAR;
  }

  private validateSeverity(s: string): "low" | "medium" | "high" {
    const v = String(s || "").toLowerCase();
    return (["low", "medium", "high"] as const).includes(v as "low" | "medium" | "high")
      ? (v as "low" | "medium" | "high")
      : "medium";
  }

  private parseErrors(errors: unknown[], essay: string): AIErrorDto[] {
    if (!Array.isArray(errors)) return [];

    return errors
      .map((e) => {
        const item         = e as Record<string, unknown>;
        const originalText = String(item.originalText || "");
        const foundIdx     = originalText ? essay.indexOf(originalText) : -1;

        const startIndex = foundIdx !== -1 ? foundIdx : 0;
        const endIndex   = foundIdx !== -1 ? foundIdx + originalText.length : 0;

        return {
          startIndex,
          endIndex,
          category:     this.validateErrorCategory(String(item.category || "")),
          originalText: originalText || essay.substring(startIndex, endIndex),
          suggestion:   String(item.suggestion  || ""),
          explanation:  String(item.explanation || "No explanation"),
          severity:     this.validateSeverity(String(item.severity || "")),
        };
      })
      .filter((e) => e.startIndex < e.endIndex);
  }

  private extractWithRegex(text: string, essay: string): AIResultDto {
    this.logger.log("Falling back to regex extraction...");

    const extractScore = (field: string) => {
      const m = text.match(new RegExp(`"${field}"\\s*:\\s*([\\d.]+)`, "i"));
      return m ? this.validateScore(parseFloat(m[1])) : 0;
    };
    const extractText = (field: string) => {
      const m = text.match(new RegExp(`"${field}"\\s*:\\s*"([^"]*(?:\\\\.[^"]*)*)"`, "i"));
      return m ? m[1].replace(/\\n/g, "\n").replace(/\\"/g, '"') : null;
    };

    const tr = extractScore("tr_band");
    const cc = extractScore("cc_band");
    const lr = extractScore("lr_band");
    const gr = extractScore("gra_band");
    const criterionScores = [tr, cc, lr, gr];
    const overallBand = criterionScores.every((s) => s > 0)
      ? this.calcOverallBand(tr, cc, lr, gr)
      : extractScore("overall_band");

    return {
      taskResponseScore: tr,
      coherenceScore:    cc,
      lexicalScore:      lr,
      grammarScore:      gr,
      overallBand,
      errors:            [],
      generalFeedback:   extractText("coaching_analysis") || "No feedback available",
      strengths:         "",
      improvements:      "",
      processedAt:       new Date(),
    };
  }
}
