// HuggingFace Inference Endpoint (vLLM OpenAI-compatible) + structured JSON output.
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import OpenAI from "openai";
import type {
  ChatCompletionCreateParamsNonStreaming,
  ChatCompletionMessageParam,
} from "openai/resources/chat/completions";
import { IAIGradingService } from "../interfaces/ai-grading.interface";
import { AIResultDto } from "../dto/ai-result.dto";
import { AIErrorDto } from "../dto/ai-error.dto";
import { buildHFGradingPrompt } from "../prompts/huggingface-grading-prompt";
import { IELTS_GRADING_JSON_SCHEMA } from "../schemas/ielts-grading.schema";
import { ErrorCategory } from "../../common/enums";

const DEFAULT_HF_MODEL_ID = "MMQuan/ielts-qwen-7b-merged-eng-v3";
const DEFAULT_REQUEST_TIMEOUT_MS = 120_000;

type StructuredMode = "structured_outputs" | "guided_json" | "none";

@Injectable()
export class HuggingFaceGradingService implements IAIGradingService {
  private readonly logger = new Logger(HuggingFaceGradingService.name);
  private client: OpenAI | null = null;
  private readonly modelId: string;
  private readonly useStructuredOutput: boolean;
  private readonly maxTokens: number;

  constructor(private configService: ConfigService) {
    const endpointUrl = this.configService.get<string>("ai.huggingface.endpointUrl");
    const apiToken    = this.configService.get<string>("ai.huggingface.apiToken");
    this.modelId      = this.configService.get<string>("ai.huggingface.modelId") || DEFAULT_HF_MODEL_ID;
    this.useStructuredOutput =
      this.configService.get<string>("ai.huggingface.useStructuredOutput") !== "false";
    this.maxTokens = Number(this.configService.get<string>("ai.huggingface.maxTokens") || 4096);

    const timeoutMs = Number(
      this.configService.get<string>("ai.huggingface.requestTimeoutMs") || DEFAULT_REQUEST_TIMEOUT_MS,
    );

    if (endpointUrl && apiToken) {
      this.client = new OpenAI({
        baseURL: `${endpointUrl.replace(/\/$/, "")}/v1`,
        apiKey:  apiToken,
        timeout: timeoutMs,
      });
      this.logger.log(
        `HF grading ready — model=${this.modelId}, structured=${this.useStructuredOutput}, timeout=${timeoutMs}ms`,
      );
    }
  }

  getProviderName(): string {
    return "HUGGINGFACE";
  }

  async isAvailable(): Promise<boolean> {
    return !!this.client;
  }

  async gradeEssay(essayContent: string, questionPrompt: string): Promise<AIResultDto> {
    if (!this.client) {
      throw new Error("HuggingFace endpoint is not configured");
    }

    const messages: ChatCompletionMessageParam[] = [
      { role: "user", content: buildHFGradingPrompt(questionPrompt, essayContent) },
    ];

    try {
      const { text, mode } = this.useStructuredOutput
        ? await this.completeWithStructuredFallback(messages)
        : await this.completePlain(messages);

      this.logger.debug(`HF response mode=${mode}`);
      return this.parseResponse(text, essayContent);
    } catch (error) {
      this.logger.error(`HuggingFace grading error: ${error.message}`, error.stack);
      throw new Error(`AI grading failed: ${error.message}`);
    }
  }

  // ─── Inference ───────────────────────────────────────────────────────────────

  private async completePlain(
    messages: ChatCompletionMessageParam[],
  ): Promise<{ text: string; mode: StructuredMode }> {
    const response = await this.client!.chat.completions.create({
      model:       this.modelId,
      messages,
      temperature: 0,
      max_tokens:  this.maxTokens,
    });
    return {
      text: response.choices[0]?.message?.content ?? "",
      mode: "none",
    };
  }

  private async completeWithStructuredFallback(
    messages: ChatCompletionMessageParam[],
  ): Promise<{ text: string; mode: StructuredMode }> {
    const modes: { mode: StructuredMode; extra: Record<string, unknown> }[] = [
      { mode: "structured_outputs", extra: { structured_outputs: { json: IELTS_GRADING_JSON_SCHEMA } } },
      { mode: "guided_json", extra: { guided_json: IELTS_GRADING_JSON_SCHEMA } },
    ];

    let lastError = "";

    for (const { mode, extra } of modes) {
      try {
        // vLLM/HF extensions (structured_outputs, guided_json) không có trong OpenAI types
        const body = {
          model:       this.modelId,
          messages,
          temperature: 0,
          max_tokens:  this.maxTokens,
          ...extra,
        } as ChatCompletionCreateParamsNonStreaming;

        const response = await this.client!.chat.completions.create(body);
        const text = response.choices[0]?.message?.content ?? "";
        if (!text.trim()) {
          throw new Error("Empty response content");
        }
        this.logger.log(`HF structured call succeeded (mode=${mode})`);
        return { text, mode };
      } catch (err) {
        lastError = err instanceof Error ? err.message : String(err);
        this.logger.warn(`HF structured mode '${mode}' failed: ${lastError}`);
      }
    }

    this.logger.warn("HF structured modes failed — falling back to plain completion");
    const plain = await this.completePlain(messages);
    return plain;
  }

  // ─── Parsing ─────────────────────────────────────────────────────────────────

  private parseResponse(responseText: string, essayContent: string): AIResultDto {
    try {
      let jsonString = responseText.trim();

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
        generalFeedback: parsed.coaching_analysis || "Không có nhận xét",
        strengths:       "",
        improvements:    "",
        processedAt:     new Date(),
      };
    } catch (error) {
      this.logger.error(`Thất bại khi parse response: ${error.message}`);
      this.logger.debug(`Raw response (200 chars): ${responseText.slice(0, 200)}`);
      return this.extractWithRegex(responseText, essayContent);
    }
  }

  private cleanJsonString(s: string): string {
    let c = s
      .replace(/" hoặc "/g, " hoặc ")
      .replace(/" or "/g, " or ");

    let braceCount = 0;
    let lastValid  = 0;
    for (let i = 0; i < c.length; i++) {
      if (c[i] === "{") braceCount++;
      if (c[i] === "}") {
        braceCount--;
        if (braceCount === 0) { lastValid = i + 1; break; }
      }
    }
    return lastValid > 0 ? c.substring(0, lastValid) : c;
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
        const item = e as Record<string, unknown>;
        const originalText = String(item.originalText || "");
        const foundIdx     = originalText ? essay.indexOf(originalText) : -1;

        const startIndex = foundIdx !== -1 ? foundIdx : 0;
        const endIndex   = foundIdx !== -1 ? foundIdx + originalText.length : 0;

        return {
          startIndex,
          endIndex,
          category:     this.validateErrorCategory(String(item.category || "")),
          originalText: originalText || essay.substring(startIndex, endIndex),
          suggestion:   String(item.suggestion   || ""),
          explanation:  String(item.explanation  || "Không có giải thích"),
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
      generalFeedback:   extractText("coaching_analysis") || "Không có nhận xét",
      strengths:         "",
      improvements:      "",
      processedAt:       new Date(),
    };
  }
}
