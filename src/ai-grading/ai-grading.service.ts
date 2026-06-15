import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { GeminiGradingService } from "./services/gemini-grading.service";
import { HuggingFaceGradingService } from "./services/huggingface-grading.service";
import { OpenRouterGradingService } from "./services/openrouter-grading.service";
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
    private huggingFaceService: HuggingFaceGradingService,
    private openRouterService: OpenRouterGradingService,
  ) {
    this.initializeProvider();
  }

  // Đọc cấu hình `ai.provider` để khởi tạo dịch vụ chấm điểm tương ứng.
  private initializeProvider(): void {
    const providerConfig = this.configService.get<string>("ai.provider") || "OPENROUTER";

    this.logger.log(`Initializing AI provider: ${providerConfig}`);

    switch (providerConfig.toUpperCase()) {
      case AIProvider.OPENROUTER:
        this.currentProvider = this.openRouterService;
        break;
      case AIProvider.HUGGINGFACE:
        this.currentProvider = this.huggingFaceService;
        break;
      case AIProvider.GEMINI:
        this.currentProvider = this.geminiService;
        break;
      default:
        this.logger.warn(`Unknown provider "${providerConfig}", defaulting to OPENROUTER`);
        this.currentProvider = this.openRouterService;
        break;
    }
  }

  /*
  Chấm điểm bài viết IELTS Task 2.
  Input:
  - essayContent: Nội dung bài viết của học viên.
  - questionPrompt: Đề thi tương ứng.
  Output:
  - AIResultDto: Kết quả chấm điểm chi tiết gồm band score, lỗi sai và nhận xét.
  */
  async gradeEssay(essayContent: string, questionPrompt: string): Promise<AIResultDto> {
    const providerName = this.currentProvider.getProviderName();

    this.logger.log(`Grading essay with provider: ${providerName}`);

    const isAvailable = await this.currentProvider.isAvailable();
    if (!isAvailable) {
      throw new Error(`AI provider "${providerName}" is not available — check API key and config`);
    }

    return this.currentProvider.gradeEssay(essayContent, questionPrompt);
  }

  // Trả về ID của AI provider đang sử dụng
  getCurrentProvider(): string {
    return this.currentProvider.getProviderName();
  }

  /*
  Đổi AI provider đang hoạt động
  Input:
  - provider: Giá trị enum của provider muốn chuyển sang.
  Output:
  - boolean: true nếu chuyển thành công, false nếu provider mục tiêu không khả dụng.
  */
  async switchProvider(provider: AIProvider): Promise<boolean> {
    this.logger.log(`Switching AI provider to: ${provider}`);

    let newProvider: IAIGradingService;

    switch (provider) {
      case AIProvider.OPENROUTER:
        newProvider = this.openRouterService;
        break;
      case AIProvider.HUGGINGFACE:
        newProvider = this.huggingFaceService;
        break;
      case AIProvider.GEMINI:
        newProvider = this.geminiService;
        break;
      default:
        newProvider = this.openRouterService;
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

  /*
  Kiểm tra các AI provider sẵn sàng
  Output:
  - Mảng { provider: string, available: boolean } cho tất cả provider đã cấu hình.
  */
  async getProvidersStatus(): Promise<{ provider: string; available: boolean }[]> {
    const [openRouterAvailable, geminiAvailable, hfAvailable] = await Promise.all([
      this.openRouterService.isAvailable(),
      this.geminiService.isAvailable(),
      this.huggingFaceService.isAvailable(),
    ]);

    return [
      { provider: "OPENROUTER",  available: openRouterAvailable },
      { provider: "GEMINI",      available: geminiAvailable     },
      { provider: "HUGGINGFACE", available: hfAvailable         },
    ];
  }
}
