import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';

// Schemas
import { Submission, SubmissionSchema, ExamQuestion, ExamQuestionSchema } from '@/schemas';

// AI Grading Module
import { AIGradingModule } from '@/ai-grading/ai-grading.module';

// Local imports
import { SubmissionsController } from './submissions.controller';
import { SubmissionsService } from './submissions.service';
import { SubmissionProcessor } from './queue/submission.processor';
import { SUBMISSION_QUEUE_NAME } from './queue/submission.constants';

@Module({
  imports: [
    // MongoDB Models
    MongooseModule.forFeature([
      { name: Submission.name, schema: SubmissionSchema },
      { name: ExamQuestion.name, schema: ExamQuestionSchema },
    ]),

    // BullMQ Queue Registration
    BullModule.registerQueueAsync({
      name: SUBMISSION_QUEUE_NAME,
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get<string>('redis.host'),
          port: configService.get<number>('redis.port'),
          password: configService.get<string>('redis.password') || undefined,
        },
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 5000,
          },
        },
      }),
      inject: [ConfigService],
    }),

    // AI Grading Service
    AIGradingModule,
  ],
  controllers: [SubmissionsController],
  providers: [
    SubmissionsService,
    SubmissionProcessor, // Worker sẽ tự động chạy khi module được load
  ],
  exports: [SubmissionsService],
})
export class SubmissionsModule {}