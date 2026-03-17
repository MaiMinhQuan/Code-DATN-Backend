import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';

import {
  Submission,
  SubmissionSchema,
  ExamQuestion,
  ExamQuestionSchema,
} from '@/schemas';
import { AIGradingModule } from '@/ai-grading/ai-grading.module';
// WebsocketModule là @Global nên không cần import,
// SubmissionsGateway sẽ được inject tự động

import { SubmissionsController } from './submissions.controller';
import { SubmissionsService } from './submissions.service';
import { SubmissionProcessor } from './queue/submission.processor';
import { SUBMISSION_QUEUE_NAME } from './queue/submission.constants';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Submission.name, schema: SubmissionSchema },
      { name: ExamQuestion.name, schema: ExamQuestionSchema },
    ]),

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

    AIGradingModule,
  ],
  controllers: [SubmissionsController],
  providers: [
    SubmissionsService,
    SubmissionProcessor,
  ],
  exports: [SubmissionsService],
})
export class SubmissionsModule {}
