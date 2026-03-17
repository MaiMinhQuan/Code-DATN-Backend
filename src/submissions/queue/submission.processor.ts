import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Job } from 'bullmq';
import { Submission, SubmissionDocument } from '@/schemas';
import { AIGradingService } from '@/ai-grading/ai-grading.service';
import { SubmissionStatus } from '@/common/enums';
import { SubmissionsGateway } from '@/websocket/gateways/submissions.gateway';  // <-- THÊM
import { SUBMISSION_QUEUE_NAME } from './submission.constants';
import { GradingJobData, GradingJobResult } from './grading-job.interface';

@Processor(SUBMISSION_QUEUE_NAME)
export class SubmissionProcessor extends WorkerHost {
  private readonly logger = new Logger(SubmissionProcessor.name);

  constructor(
    @InjectModel(Submission.name)
    private readonly submissionModel: Model<SubmissionDocument>,
    private readonly aiGradingService: AIGradingService,
    private readonly submissionsGateway: SubmissionsGateway,  // <-- THÊM
  ) {
    super();
  }

  async process(job: Job<GradingJobData>): Promise<GradingJobResult> {
    const { submissionId, userId, essayContent, questionPrompt, attemptNumber } = job.data;

    this.logger.log(`[Job ${job.id}] Processing submission: ${submissionId}`);
    this.logger.log(`[Job ${job.id}] User: ${userId}, Attempt: ${attemptNumber}`);

    try {
      // 1. Cập nhật status -> PROCESSING
      await this.updateSubmissionStatus(submissionId, SubmissionStatus.PROCESSING);

      // Emit progress event
      this.submissionsGateway.emitSubmissionProgress(userId, {
        submissionId,
        progress: 10,
        message: 'Đang bắt đầu chấm bài...',
        timestamp: new Date(),
      });

      await job.updateProgress(10);

      // 2. Gọi AI Grading Service
      this.logger.log(`[Job ${job.id}] Calling AI Grading Service...`);

      // Emit progress
      this.submissionsGateway.emitSubmissionProgress(userId, {
        submissionId,
        progress: 30,
        message: 'Đang phân tích bài viết...',
        timestamp: new Date(),
      });

      const aiResult = await this.aiGradingService.gradeEssay(essayContent, questionPrompt);

      // Emit progress
      this.submissionsGateway.emitSubmissionProgress(userId, {
        submissionId,
        progress: 80,
        message: 'Đang lưu kết quả...',
        timestamp: new Date(),
      });

      await job.updateProgress(80);

      // 3. Cập nhật Submission với kết quả AI
      await this.submissionModel.findByIdAndUpdate(submissionId, {
        status: SubmissionStatus.COMPLETED,
        aiResult: {
          ...aiResult,
          processedAt: new Date(),
        },
      });

      await job.updateProgress(100);

      this.logger.log(`[Job ${job.id}] Completed successfully. Overall band: ${aiResult.overallBand}`);

      // 4. Emit WebSocket event - COMPLETED
      this.submissionsGateway.emitSubmissionStatusUpdated(userId, {
        submissionId,
        status: SubmissionStatus.COMPLETED,
        hasResult: true,
        overallBand: aiResult.overallBand,
        timestamp: new Date(),
      });

      return {
        submissionId,
        success: true,
        processedAt: new Date(),
      };

    } catch (error) {
      this.logger.error(`[Job ${job.id}] Failed: ${error.message}`, error.stack);

      // Cập nhật status -> FAILED
      await this.updateSubmissionFailed(submissionId, error.message);

      // Emit WebSocket event - FAILED
      this.submissionsGateway.emitSubmissionStatusUpdated(userId, {
        submissionId,
        status: SubmissionStatus.FAILED,
        hasResult: false,
        errorMessage: error.message,
        timestamp: new Date(),
      });

      throw error;
    }
  }

  private async updateSubmissionStatus(submissionId: string, status: SubmissionStatus): Promise<void> {
    await this.submissionModel.findByIdAndUpdate(submissionId, { status });
  }

  private async updateSubmissionFailed(submissionId: string, errorMessage: string): Promise<void> {
    await this.submissionModel.findByIdAndUpdate(submissionId, {
      status: SubmissionStatus.FAILED,
      errorMessage: errorMessage || 'Unknown error occurred during AI grading',
    });
  }

  // ============ EVENT HANDLERS ============

  @OnWorkerEvent('completed')
  onCompleted(job: Job<GradingJobData>, result: GradingJobResult) {
    this.logger.log(`[Job ${job.id}] Completed - Submission: ${result.submissionId}`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job<GradingJobData>, error: Error) {
    this.logger.error(`[Job ${job.id}] Failed - Error: ${error.message}`);
  }

  @OnWorkerEvent('active')
  onActive(job: Job<GradingJobData>) {
    this.logger.log(`[Job ${job.id}] Started processing`);

    // Emit status update khi bắt đầu processing
    const { userId, submissionId } = job.data;
    this.submissionsGateway.emitSubmissionStatusUpdated(userId, {
      submissionId,
      status: SubmissionStatus.PROCESSING,
      hasResult: false,
      timestamp: new Date(),
    });
  }

  @OnWorkerEvent('progress')
  onProgress(job: Job<GradingJobData>, progress: number) {
    this.logger.debug(`[Job ${job.id}] Progress: ${progress}%`);
  }

  @OnWorkerEvent('stalled')
  onStalled(jobId: string) {
    this.logger.warn(`[Job ${jobId}] Stalled - will be retried`);
  }
}
