/** Module gốc của ứng dụng — kết nối tất cả feature module, cấu hình toàn cục và BullMQ. */
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
import { NoteCollectionsModule } from "./note-collections/note-collections.module";
import { FlashcardsModule } from "./flashcards/flashcards.module";
import { ExamQuestionsModule } from "./exam-questions/exam-questions.module";
import { AIGradingModule } from "./ai-grading/ai-grading.module";
import { SubmissionsModule } from "./submissions/submissions.module";
import { BullModule } from "@nestjs/bullmq";
import { WebsocketModule } from "./websocket/websocket.module";

@Module({
  imports: [
    // Tải biến môi trường toàn cục; hỗ trợ ghi đè bằng .env.local
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig, redisConfig, aiConfig],
      envFilePath: [".env.local", ".env"],
    }),

    // Cấu hình kết nối Redis toàn cục cho BullMQ từ biến môi trường
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get<string>("redis.host"),
          port: configService.get<number>("redis.port"),
          // Bỏ qua trường password khi không được thiết lập để tránh lỗi xác thực Redis
          password: configService.get<string>("redis.password") || undefined,
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
    NoteCollectionsModule,
    FlashcardsModule,
    ExamQuestionsModule,
    AIGradingModule,
    SubmissionsModule,
    WebsocketModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
