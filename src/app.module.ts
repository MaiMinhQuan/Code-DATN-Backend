import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import databaseConfig from './config/database.config';
import redisConfig from './config/redis.config';
import aiConfig from './config/ai.config';

@Module({
  imports: [
    // Config Module - Load environment variables
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig, redisConfig, aiConfig],
      envFilePath: ['.env.local', '.env'],
    }),

    // MongoDB Connection
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('database.uri'),
        retryAttempts: 3,
        retryDelay: 1000,
      }),
    }),

    // Feature Modules will be added here in next steps
    // UsersModule,
    // CoursesModule,
    // SampleEssaysModule,
    // NotebookModule,
    // FlashcardsModule,
    // SubmissionsModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
