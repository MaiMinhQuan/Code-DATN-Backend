// BullMQ worker: chấm bài bằng AI và emit tiến trình/trạng thái qua WebSocket.
import { Processor, WorkerHost, OnWorkerEvent } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { Job } from "bullmq";
import { Submission, SubmissionDocument } from "@/schemas";
import { AIGradingService } from "@/ai-grading/ai-grading.service";
import { SubmissionStatus } from "@/common/enums";
import { SubmissionsGateway } from "@/websocket/gateways/submissions.gateway";
import { SUBMISSION_QUEUE_NAME } from "./submission.constants";
import { GradingJobData, GradingJobResult } from "./grading-job.interface";

@Processor(SUBMISSION_QUEUE_NAME)
export class SubmissionProcessor extends WorkerHost {
  private readonly logger = new Logger(SubmissionProcessor.name);

  constructor(
    @InjectModel(Submission.name)
    private readonly submissionModel: Model<SubmissionDocument>,
    private readonly aiGradingService: AIGradingService,
    private readonly submissionsGateway: SubmissionsGateway,
  ) {
    super();
  }

  /*
  Xử lý job chấm bài: PROCESSING -> gọi AI -> lưu kết quả -> COMPLETED/FAILED và emit WS
  Input:
    - job — BullMQ Job (GradingJobData)
   */
  async process(job: Job<GradingJobData>): Promise<GradingJobResult> {
    const { submissionId, userId, essayContent, questionPrompt, attemptNumber } = job.data;

    this.logger.log(`[Job ${job.id}] Processing submission: ${submissionId}`);
    this.logger.log(`[Job ${job.id}] User: ${userId}, Attempt: ${attemptNumber}`);

    try {
      // Đánh dấu submission là PROCESSING để UI hiện thanh tiến trình
      await this.updateSubmissionStatus(submissionId, SubmissionStatus.PROCESSING);

      this.submissionsGateway.emitSubmissionProgress(userId, {
        submissionId,
        progress: 10,
        message: "Đang bắt đầu chấm bài...",
        timestamp: new Date(),
      });

      await job.updateProgress(10);

      // Emit "analysing" progress trước khi gọi AI
      this.logger.log(`[Job ${job.id}] Calling AI Grading Service...`);

      this.submissionsGateway.emitSubmissionProgress(userId, {
        submissionId,
        progress: 30,
        message: "Đang phân tích bài viết...",
        timestamp: new Date(),
      });

      const aiResult = await this.aiGradingService.gradeEssay(essayContent, questionPrompt);

      // Emit "saving" progress sau khi AI trả về
      this.submissionsGateway.emitSubmissionProgress(userId, {
        submissionId,
        progress: 80,
        message: "Đang lưu kết quả...",
        timestamp: new Date(),
      });

      await job.updateProgress(80);

      // Lưu kết quả AI và đánh dấu submission là COMPLETED
      await this.submissionModel.findByIdAndUpdate(submissionId, {
        status: SubmissionStatus.COMPLETED,
        aiResult: {
          ...aiResult,
          processedAt: new Date(),
        },
      });

      await job.updateProgress(100);

      this.logger.log(`[Job ${job.id}] Completed successfully. Overall band: ${aiResult.overallBand}`);

      // Thông báo cho client rằng chấm bài đã hoàn thành
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

      // Đánh dấu FAILED và thông báo cho client để retry
      await this.updateSubmissionFailed(submissionId, error.message);

      this.submissionsGateway.emitSubmissionStatusUpdated(userId, {
        submissionId,
        status: SubmissionStatus.FAILED,
        hasResult: false,
        errorMessage: error.message,
        timestamp: new Date(),
      });

      throw error; // Gửi lại để BullMQ ghi nhận lỗi và áp dụng logic retry
    }
  }

  /*
  Cập nhật status của submission
  Input:
    - submissionId — id submission
    - status — trạng thái mới
   */
  private async updateSubmissionStatus(submissionId: string, status: SubmissionStatus): Promise<void> {
    await this.submissionModel.findByIdAndUpdate(submissionId, { status });
  }

  /*
  Đánh dấu FAILED và lưu errorMessage vào submission
  Input:
    - submissionId — id submission
    - errorMessage — message lỗi
   */
  private async updateSubmissionFailed(submissionId: string, errorMessage: string): Promise<void> {
    await this.submissionModel.findByIdAndUpdate(submissionId, {
      status: SubmissionStatus.FAILED,
      errorMessage: errorMessage || "Unknown error occurred during AI grading",
    });
  }

  // BullMQ event: job completed
  @OnWorkerEvent("completed")
  onCompleted(job: Job<GradingJobData>, result: GradingJobResult) {
    this.logger.log(`[Job ${job.id}] Completed - Submission: ${result.submissionId}`);
  }

  // BullMQ event: job failed (hết retry)
  @OnWorkerEvent("failed")
  onFailed(job: Job<GradingJobData>, error: Error) {
    this.logger.error(`[Job ${job.id}] Failed - Error: ${error.message}`);
  }

  /*
  BullMQ event: job active -> emit PROCESSING cho client
  Input:
    - job — BullMQ Job
   */
  @OnWorkerEvent("active")
  onActive(job: Job<GradingJobData>) {
    this.logger.log(`[Job ${job.id}] Started processing`);

    const { userId, submissionId } = job.data;
    this.submissionsGateway.emitSubmissionStatusUpdated(userId, {
      submissionId,
      status: SubmissionStatus.PROCESSING,
      hasResult: false,
      timestamp: new Date(),
    });
  }

  // BullMQ event: job progress
  @OnWorkerEvent("progress")
  onProgress(job: Job<GradingJobData>, progress: number) {
    this.logger.debug(`[Job ${job.id}] Progress: ${progress}%`);
  }

  // BullMQ event: job stalled (sẽ được retry)
  @OnWorkerEvent("stalled")
  onStalled(jobId: string) {
    this.logger.warn(`[Job ${jobId}] Stalled - will be retried`);
  }
}
