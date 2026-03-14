import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
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

@Module({
  imports: [
    // Config Module - Load environment variables
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig, redisConfig, aiConfig],
      envFilePath: [".env.local", ".env"],
    }),

    DatabaseModule,
    AuthModule,
    UsersModule,
    TopicsModule,
    CoursesModule,
    LessonsModule,
    SampleEssaysModule,
    FavoriteEssaysModule,
    NotebookModule
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
