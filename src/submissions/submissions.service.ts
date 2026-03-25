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


  // Tạo bài nộp mới (DRAFT)
  // userId: id của học viên
  // createDto: { questionId, essayContent, timeSpentSeconds }
  async create(userId: string, createDto: CreateSubmissionDto): Promise<SubmissionDocument> {
    // 1. Kiểm tra question có tồn tại không
    const question = await this.examQuestionModel.findById(createDto.questionId);
    if (!question) {
      throw new NotFoundException(`Exam question with ID ${createDto.questionId} not found`);
    }

    // 2. Tính attempt number (lần làm thứ mấy)
    const previousAttempts = await this.submissionModel.countDocuments({
      userId: new Types.ObjectId(userId),
      questionId: new Types.ObjectId(createDto.questionId),
    });

    // 3. Tạo submission mới
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


  // Nộp bài để chấm - Đẩy job vào Queue
  // submissionId: ID của bài nộp cần chấm
  // userId: ID của học viên
  async submitForGrading(submissionId: string, userId: string): Promise<{ message: string; jobId: string }> {
    // 1. Tìm submission
    const submission = await this.submissionModel.findById(submissionId);
    if (!submission) {
      throw new NotFoundException(`Submission with ID ${submissionId} not found`);
    }

    // 2. Kiểm tra quyền sở hữu
    if (submission.userId.toString() !== userId) {
      throw new ForbiddenException("You can only submit your own submissions");
    }

    // 3. Kiểm tra status - chỉ cho phép submit từ DRAFT hoặc FAILED
    if (![SubmissionStatus.DRAFT, SubmissionStatus.FAILED].includes(submission.status)) {
      throw new BadRequestException(
        `Cannot submit. Current status: ${submission.status}. Only DRAFT or FAILED submissions can be submitted.`
      );
    }

    // 4. Lấy question prompt
    const question = await this.examQuestionModel.findById(submission.questionId);
    if (!question) {
      throw new NotFoundException("Associated exam question not found");
    }

    // 5. Cập nhật status -> SUBMITTED
    submission.status = SubmissionStatus.SUBMITTED;
    submission.submittedAt = new Date();
    submission.errorMessage = undefined; // Clear previous error
    await submission.save();

    // 6. Đẩy job vào BullMQ Queue
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
        jobId: `grading-${submissionId}-${Date.now()}`, // Unique job ID
      }
    );

    this.logger.log(`Submitted job ${job.id} for submission ${submissionId}`);

    // 7. Tăng attempt count cho question
    await this.examQuestionModel.findByIdAndUpdate(
      submission.questionId,
      { $inc: { attemptCount: 1 } }
    );

    return {
      message: "Submission queued for AI grading",
      jobId: job.id as string,
    };
  }


  // Lấy danh sách bài nộp của user
  // userId: ID của học viên
  // queryDto: { questionId?, status?, page?, limit? }
  async findByUser(userId: string, queryDto: QuerySubmissionDto): Promise<{
    data: SubmissionDocument[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const { questionId, status, page = 1, limit = 10 } = queryDto;

    // Xây dựng filter cho query
    const filter: any = { userId: new Types.ObjectId(userId) };
    if (questionId) filter.questionId = new Types.ObjectId(questionId);
    if (status) filter.status = status;

    // Đếm tổng số bài nộp
    const total = await this.submissionModel.countDocuments(filter);

    // Truy vấn với phân trang
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


  // Lấy chi tiết 1 bài nộp (bao gồm aiResult nếu có)
  // submissionId: ID của bài nộp
  // userId: ID của học viên
  async findOne(submissionId: string, userId: string): Promise<SubmissionDocument> {
    const submission = await this.submissionModel
      .findById(submissionId)
      .populate("questionId", "title questionPrompt suggestedOutline")
      .exec();

    if (!submission) {
      throw new NotFoundException(`Submission with ID ${submissionId} not found`);
    }

    // Kiểm tra quyền sở hữu
    if (submission.userId.toString() !== userId) {
      throw new ForbiddenException("You can only view your own submissions");
    }

    return submission;
  }


  // Cập nhật bài nháp (chỉ khi status = DRAFT)
  // submissionId: ID của bài nộp cần cập nhật
  // userId: ID của học viên
  // updateDto: { essayContent?, timeSpentSeconds? }
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

    // Update các trường
    if (updateDto.essayContent) submission.essayContent = updateDto.essayContent;
    if (updateDto.timeSpentSeconds) submission.timeSpentSeconds = updateDto.timeSpentSeconds;

    return submission.save();
  }


  // Xóa bài nháp (chỉ khi status = DRAFT)
  // submissionId: ID của bài nộp cần xóa
  // userId: ID của học viên
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


  // Lấy trạng thái Queue (Admin)
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
