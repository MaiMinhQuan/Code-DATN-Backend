import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Job } from 'bullmq';
import { Submission, SubmissionDocument } from '@/schemas';
import { AIGradingService } from '@/ai-grading/ai-grading.service';
import { SubmissionStatus } from '@/common/enums';
import { SUBMISSION_QUEUE_NAME, SUBMISSION_JOB_NAMES } from './submission.constants';
import { GradingJobData, GradingJobResult } from './grading-job.interface';

@Processor(SUBMISSION_QUEUE_NAME)
export class SubmissionProcessor extends WorkerHost {
  private readonly logger = new Logger(SubmissionProcessor.name);

  constructor(
    @InjectModel(Submission.name)
    private readonly submissionModel: Model<SubmissionDocument>,
    private readonly aiGradingService: AIGradingService,
  ) {
    super();
  }

  /**
   * Xử lý job chấm bài
   * Method này được BullMQ gọi tự động khi có job mới
   */
  async process(job: Job<GradingJobData>): Promise<GradingJobResult> {
    const { submissionId, userId, essayContent, questionPrompt, attemptNumber } = job.data;

    this.logger.log(`[Job ${job.id}] Processing submission: ${submissionId}`);
    this.logger.log(`[Job ${job.id}] User: ${userId}, Attempt: ${attemptNumber}`);

    try {
      // 1. Cập nhật status -> PROCESSING
      await this.updateSubmissionStatus(submissionId, SubmissionStatus.PROCESSING);

      // 2. Log tiến độ
      await job.updateProgress(10);

      // 3. Gọi AI Grading Service
      this.logger.log(`[Job ${job.id}] Calling AI Grading Service...`);
      const aiResult = await this.aiGradingService.gradeEssay(essayContent, questionPrompt);

      await job.updateProgress(80);

      // 4. Cập nhật Submission với kết quả AI
      await this.submissionModel.findByIdAndUpdate(submissionId, {
        status: SubmissionStatus.COMPLETED,
        aiResult: {
          ...aiResult,
          processedAt: new Date(),
        },
      });

      await job.updateProgress(100);

      this.logger.log(`[Job ${job.id}] Completed successfully. Overall band: ${aiResult.overallBand}`);

      // 5. TODO: Emit WebSocket event (Giai đoạn 7)
      // await this.submissionsGateway.emitSubmissionCompleted(userId, submissionId);

      return {
        submissionId,
        success: true,
        processedAt: new Date(),
      };

    } catch (error) {
      this.logger.error(`[Job ${job.id}] Failed: ${error.message}`, error.stack);

      // Cập nhật status -> FAILED với error message
      await this.updateSubmissionFailed(submissionId, error.message);

      // Throw error để BullMQ retry (nếu còn attempts)
      throw error;
    }
  }

  /**
   * Helper: Cập nhật status submission
   */
  private async updateSubmissionStatus(submissionId: string, status: SubmissionStatus): Promise<void> {
    await this.submissionModel.findByIdAndUpdate(submissionId, { status });
  }

  /**
   * Helper: Cập nhật submission khi failed
   */
  private async updateSubmissionFailed(submissionId: string, errorMessage: string): Promise<void> {
    await this.submissionModel.findByIdAndUpdate(submissionId, {
      status: SubmissionStatus.FAILED,
      errorMessage: errorMessage || 'Unknown error occurred during AI grading',
    });
  }

  // ============ EVENT HANDLERS ============

  @OnWorkerEvent('completed')
  onCompleted(job: Job<GradingJobData>, result: GradingJobResult) {
    this.logger.log(`[Job ${job.id}] Completed event - Submission: ${result.submissionId}`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job<GradingJobData>, error: Error) {
    this.logger.error(`[Job ${job.id}] Failed event - Error: ${error.message}`);

    // TODO: Emit WebSocket event thông báo failed (Giai đoạn 7)
    // const { userId, submissionId } = job.data;
    // this.submissionsGateway.emitSubmissionFailed(userId, submissionId, error.message);
  }

  @OnWorkerEvent('progress')
  onProgress(job: Job<GradingJobData>, progress: number) {
    this.logger.debug(`[Job ${job.id}] Progress: ${progress}%`);
  }

  @OnWorkerEvent('active')
  onActive(job: Job<GradingJobData>) {
    this.logger.log(`[Job ${job.id}] Started processing`);
  }

  @OnWorkerEvent('stalled')
  onStalled(jobId: string) {
    this.logger.warn(`[Job ${jobId}] Stalled - will be retried`);
  }
}
