import { Injectable, Logger, NotFoundException, BadRequestException, ForbiddenException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { InjectQueue } from "@nestjs/bullmq";
import { Model, Types } from "mongoose";
import { Queue } from "bullmq";
import { Submission, SubmissionDocument, ExamQuestion, ExamQuestionDocument } from "@/schemas";
import { SubmissionStatus } from "@/common/enums";
import { CreateSubmissionDto, UpdateSubmissionDto, QuerySubmissionDto } from "./dto";
import { SUBMISSION_QUEUE_NAME, SUBMISSION_JOB_NAMES, DEFAULT_JOB_OPTIONS } from "./queue/submission.constants";
import { GradingJobData } from "./queue/grading-job.interface";

@Injectable()
export class SubmissionsService {
  private readonly logger = new Logger(SubmissionsService.name);

  constructor(
    @InjectModel(Submission.name)
    private readonly submissionModel: Model<SubmissionDocument>,

    @InjectModel(ExamQuestion.name)
    private readonly examQuestionModel: Model<ExamQuestionDocument>,

    @InjectQueue(SUBMISSION_QUEUE_NAME)
    private readonly submissionQueue: Queue<GradingJobData>,
  ) {}

  /*
  Tạo submission mới (DRAFT)
  Input:
    - userId — id user từ JWT
    - createDto — body request
   */
  async create(userId: string, createDto: CreateSubmissionDto): Promise<SubmissionDocument> {
    // Kiểm tra đề thi có tồn tại không trước khi tạo submission
    const question = await this.examQuestionModel.findById(createDto.questionId);
    if (!question) {
      throw new NotFoundException(`Exam question with ID ${createDto.questionId} not found`);
    }

    // Đếm số lần user đã làm đề này để tính attemptNumber
    const previousAttempts = await this.submissionModel.countDocuments({
      userId: new Types.ObjectId(userId),
      questionId: new Types.ObjectId(createDto.questionId),
    });

    const submission = new this.submissionModel({
      userId: new Types.ObjectId(userId),
      questionId: new Types.ObjectId(createDto.questionId),
      essayContent: createDto.essayContent,
      timeSpentSeconds: createDto.timeSpentSeconds,
      status: SubmissionStatus.DRAFT,
      attemptNumber: previousAttempts + 1,
    });

    const saved = await submission.save();
    this.logger.log(`Created submission ${saved._id} for user ${userId}`);

    return saved;
  }

  /*
  Submit submission để chấm AI: DRAFT/FAILED -> SUBMITTED và add job vào BullMQ
  Input:
    - submissionId — id submission
    - userId — id user (phải là chủ bài)
   */
  async submitForGrading(submissionId: string, userId: string): Promise<{ message: string; jobId: string }> {
    const submission = await this.submissionModel.findById(submissionId);
    if (!submission) {
      throw new NotFoundException(`Submission with ID ${submissionId} not found`);
    }

    if (submission.userId.toString() !== userId) {
      throw new ForbiddenException("You can only submit your own submissions");
    }

    // Chỉ cho phép nộp lại submission có status DRAFT hoặc FAILED
    if (![SubmissionStatus.DRAFT, SubmissionStatus.FAILED].includes(submission.status)) {
      throw new BadRequestException(
        `Cannot submit. Current status: ${submission.status}. Only DRAFT or FAILED submissions can be submitted.`
      );
    }

    const question = await this.examQuestionModel.findById(submission.questionId);
    if (!question) {
      throw new NotFoundException("Associated exam question not found");
    }

    // Đánh dấu là SUBMITTED và xóa bất kỳ message lỗi trước đó
    submission.status = SubmissionStatus.SUBMITTED;
    submission.submittedAt = new Date();
    submission.errorMessage = undefined;
    await submission.save();

    // Xây dựng và đẩy job vào BullMQ queue
    const jobData: GradingJobData = {
      submissionId: submission._id.toString(),
      userId: userId,
      essayContent: submission.essayContent,
      questionPrompt: question.questionPrompt,
      attemptNumber: submission.attemptNumber,
    };

    const job = await this.submissionQueue.add(
      SUBMISSION_JOB_NAMES.GRADE_ESSAY,
      jobData,
      {
        ...DEFAULT_JOB_OPTIONS,
        jobId: `grading-${submissionId}-${Date.now()}`, // ID duy nhất để tránh duplicate jobs
      }
    );

    this.logger.log(`Submitted job ${job.id} for submission ${submissionId}`);

    // Tăng số lần user đã làm đề này
    await this.examQuestionModel.findByIdAndUpdate(
      submission.questionId,
      { $inc: { attemptCount: 1 } }
    );

    return {
      message: "Submission queued for AI grading",
      jobId: job.id as string,
    };
  }

  /*
  Danh sách submission của user
  Input:
    - userId — id user
    - queryDto — questionId/status/page/limit
   */
  async findByUser(userId: string, queryDto: QuerySubmissionDto): Promise<{
    data: SubmissionDocument[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const { questionId, status, page = 1, limit = 10 } = queryDto;

    // Xây dựng filter object từ query params
    const filter: any = { userId: new Types.ObjectId(userId) };
    if (questionId) filter.questionId = new Types.ObjectId(questionId);
    if (status) filter.status = status;

    const total = await this.submissionModel.countDocuments(filter);

    const data = await this.submissionModel
      .find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("questionId", "title questionPrompt")
      .exec();

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /*
  Chi tiết một submission
  Input:
    - submissionId — id submission
    - userId — id user (phải là chủ bài)
   */
  async findOne(submissionId: string, userId: string): Promise<SubmissionDocument> {
    const submission = await this.submissionModel
      .findById(submissionId)
      .populate("questionId", "title questionPrompt suggestedOutline")
      .exec();

    if (!submission) {
      throw new NotFoundException(`Submission with ID ${submissionId} not found`);
    }

    if (submission.userId.toString() !== userId) {
      throw new ForbiddenException("You can only view your own submissions");
    }

    return submission;
  }

  /*
  Cập nhật draft (chỉ khi status = DRAFT)
  Input:
    - submissionId — id submission
    - userId — id user (phải là chủ bài)
    - updateDto — body update
   */
  async updateDraft(submissionId: string, userId: string, updateDto: UpdateSubmissionDto): Promise<SubmissionDocument> {
    const submission = await this.submissionModel.findById(submissionId);

    if (!submission) {
      throw new NotFoundException(`Submission with ID ${submissionId} not found`);
    }

    if (submission.userId.toString() !== userId) {
      throw new ForbiddenException("You can only update your own submissions");
    }

    if (submission.status !== SubmissionStatus.DRAFT) {
      throw new BadRequestException("Can only update submissions in DRAFT status");
    }

    if (updateDto.essayContent) submission.essayContent = updateDto.essayContent;
    if (updateDto.timeSpentSeconds) submission.timeSpentSeconds = updateDto.timeSpentSeconds;

    return submission.save();
  }

  /*
  Xóa vĩnh viễn draft (chỉ khi status = DRAFT)
  Input:
    - submissionId — id submission
    - userId — id user (phải là chủ bài)
   */
  async deleteDraft(submissionId: string, userId: string): Promise<void> {
    const submission = await this.submissionModel.findById(submissionId);

    if (!submission) {
      throw new NotFoundException(`Submission with ID ${submissionId} not found`);
    }

    if (submission.userId.toString() !== userId) {
      throw new ForbiddenException("You can only delete your own submissions");
    }

    if (submission.status !== SubmissionStatus.DRAFT) {
      throw new BadRequestException("Can only delete submissions in DRAFT status");
    }

    await this.submissionModel.findByIdAndDelete(submissionId);
    this.logger.log(`Deleted draft submission ${submissionId}`);
  }


  // Thống kê số lượng job trong BullMQ queue (admin)

  async getQueueStatus(): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
  }> {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      this.submissionQueue.getWaitingCount(),
      this.submissionQueue.getActiveCount(),
      this.submissionQueue.getCompletedCount(),
      this.submissionQueue.getFailedCount(),
      this.submissionQueue.getDelayedCount(),
    ]);

    return { waiting, active, completed, failed, delayed };
  }
}
