import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AIGradingService } from "./ai-grading.service";
import { AIGradingController } from "./ai-grading.controller";
import { GeminiGradingService } from "./services/gemini-grading.service";

@Module({
  imports: [ConfigModule],
  controllers: [AIGradingController],
  providers: [
    AIGradingService,
    GeminiGradingService,
  ],
  exports: [AIGradingService],
})
export class AIGradingModule {}
