import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import databaseConfig from "./config/database.config";
import redisConfig from "./config/redis.config";
import aiConfig from "./config/ai.config";
import { DatabaseModule } from "./database/database.module";
import { AuthModule } from "./auth/auth.module";
import { UsersModule } from "./users/users.module";
import { TopicsModule } from "./topics/topics.module";
import { CoursesModule } from "./courses/courses.module";
import { LessonsModule } from "./lessons/lessons.module";
import { SampleEssaysModule } from "./sample-essays/sample-essays.module";
import { FavoriteEssaysModule } from "./favorite-essays/favorite-essays.module";
import { NotebookModule } from "./notebook/notebook.module";
import { FlashcardsModule } from "./flashcards/flashcards.module";
import { ExamQuestionsModule } from "./exam-questions/exam-questions.module";
import { AIGradingModule } from "./ai-grading/ai-grading.module";
import { SubmissionsModule } from "./submissions/submissions.module";
import { BullModule } from "@nestjs/bullmq";
@Module({
  imports: [
    // Config Module - Load environment variables
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig, redisConfig, aiConfig],
      envFilePath: [".env.local", ".env"],
    }),

    // BullMQ Global Configuration  <-- THÊM BLOCK NÀY
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get<string>('redis.host'),
          port: configService.get<number>('redis.port'),
          password: configService.get<string>('redis.password') || undefined,
        },
      }),
      inject: [ConfigService],
    }),

    DatabaseModule,
    AuthModule,
    UsersModule,
    TopicsModule,
    CoursesModule,
    LessonsModule,
    SampleEssaysModule,
    FavoriteEssaysModule,
    NotebookModule,
    FlashcardsModule,
    ExamQuestionsModule,
    AIGradingModule,
    SubmissionsModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
