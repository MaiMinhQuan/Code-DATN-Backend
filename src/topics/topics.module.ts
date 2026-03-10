import { Module } from "@nestjs/common";
import { DatabaseModule } from "@/database/database.module";
import { TopicsController } from "./topics.controller";
import { TopicsService } from "./topics.service";

@Module({
  imports: [DatabaseModule],
  controllers: [TopicsController],
  providers: [TopicsService],
  exports: [TopicsService],
})
export class TopicsModule {}
