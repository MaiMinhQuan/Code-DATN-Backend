import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { IAIGradingService } from "../interfaces/ai-grading.interface";
import { AIResultDto } from "../dto/ai-result.dto";

@Injectable()
export class MistralGradingService implements IAIGradingService {
  private readonly logger = new Logger(MistralGradingService.name);

  constructor(private configService: ConfigService) {}

  getProviderName(): string {
    return "MISTRAL";
  }

  async isAvailable(): Promise<boolean> {
    const gpuNodeUrl = this.configService.get<string>("ai.mistral.gpuNodeUrl");
    // TODO: Implement health check to GPU node
    return !!gpuNodeUrl;
  }

  async gradeEssay(essayContent: string, questionPrompt: string): Promise<AIResultDto> {
    // TODO: Implement khi có GPU Node với Mistral 7B fine-tuned model

    this.logger.warn("Mistral grading service is not implemented yet");

    throw new Error(
      "Mistral grading service is not available. Please use Gemini provider."
    );

    // Future implementation:
    // 1. Call to GPU Node API với Mistral 7B model
    // 2. Parse response
    // 3. Return AIResultDto
  }
}
