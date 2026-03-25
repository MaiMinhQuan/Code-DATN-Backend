import { Injectable, Logger, Inject } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { GeminiGradingService } from "./services/gemini-grading.service";
import { IAIGradingService } from "./interfaces/ai-grading.interface";
import { AIResultDto } from "./dto/ai-result.dto";
import { AIProvider } from "../common/enums";

@Injectable()
export class AIGradingService {
  private readonly logger = new Logger(AIGradingService.name);
  private currentProvider: IAIGradingService;

  constructor(
    private configService: ConfigService,
    private geminiService: GeminiGradingService,
  ) {
    this.initializeProvider();
  }

  // Khởi tạo AI provider dựa trên config (ai.provider trong .env)
  private initializeProvider(): void {
    const providerConfig = this.configService.get<string>("ai.provider") || "GEMINI";

    this.logger.log(`Initializing AI provider: ${providerConfig}`);

    switch (providerConfig.toUpperCase()) {
      case AIProvider.GEMINI:
      default:
        this.currentProvider = this.geminiService;
        break;
    }
  }

  // Chấm bài với provider hiện tại
  // essayContent: Bài viết của học viên
  // questionPrompt: Đề thi
  async gradeEssay(essayContent: string, questionPrompt: string): Promise<AIResultDto> {
    const providerName = this.currentProvider.getProviderName();

    this.logger.log(`Grading essay with provider: ${providerName}`);

    // Kiểm tra provider có sẵn sàng không
    const isAvailable = await this.currentProvider.isAvailable();
    if (!isAvailable) {
      this.logger.warn(`Provider ${providerName} is not available, falling back to Gemini`);

      // Fallback to Gemini nếu provider chính không available
      if (providerName !== "GEMINI") {
        const geminiAvailable = await this.geminiService.isAvailable();
        if (geminiAvailable) {
          return this.geminiService.gradeEssay(essayContent, questionPrompt);
        }
      }

      throw new Error("No AI provider is available");
    }

    return this.currentProvider.gradeEssay(essayContent, questionPrompt);
  }

  // Lấy tên provider hiện tại
  getCurrentProvider(): string {
    return this.currentProvider.getProviderName();
  }

  // Chuyển đổi provider (runtime switching nếu cần)
  async switchProvider(provider: AIProvider): Promise<boolean> {
    this.logger.log(`Switching AI provider to: ${provider}`);

    let newProvider: IAIGradingService;

    switch (provider) {
      case AIProvider.GEMINI:
      default:
        newProvider = this.geminiService;
        break;
    }

    const isAvailable = await newProvider.isAvailable();
    if (!isAvailable) {
      this.logger.error(`Provider ${provider} is not available`);
      return false;
    }

    this.currentProvider = newProvider;
    this.logger.log(`Successfully switched to provider: ${provider}`);
    return true;
  }

  // Kiểm tra trạng thái các providers
  async getProvidersStatus(): Promise<{ provider: string; available: boolean }[]> {
    const geminiAvailable = await this.geminiService.isAvailable();

    return [
      { provider: "GEMINI", available: geminiAvailable },
    ];
  }
}
