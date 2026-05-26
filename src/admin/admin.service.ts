// Service tính toán thống kê tổng quan cho Admin Dashboard.
import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import {
  User,
  Topic,
  Course,
  ExamQuestion,
  SampleEssay,
  Submission,
  SubmissionDocument,
} from "@/schemas";
import { SubmissionStatus } from "@/common/enums";

@Injectable()
export class AdminService {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Topic.name) private topicModel: Model<Topic>,
    @InjectModel(Course.name) private courseModel: Model<Course>,
    @InjectModel(ExamQuestion.name) private examQuestionModel: Model<ExamQuestion>,
    @InjectModel(SampleEssay.name) private sampleEssayModel: Model<SampleEssay>,
    @InjectModel(Submission.name) private submissionModel: Model<SubmissionDocument>,
  ) {}

  /*
  Trả về các số liệu tổng quan cho Admin Dashboard.
  */
  async getStats() {
    const [
      totalUsers,
      totalTopics,
      totalCourses,
      totalExamQuestions,
      totalSampleEssays,
      totalSubmissions,
      completedSubmissions,
      avgBandResult,
    ] = await Promise.all([
      this.userModel.countDocuments(),
      this.topicModel.countDocuments({ isActive: true }),
      this.courseModel.countDocuments({ isActive: true }),
      this.examQuestionModel.countDocuments(),
      this.sampleEssayModel.countDocuments(),
      this.submissionModel.countDocuments(),
      this.submissionModel.countDocuments({ status: SubmissionStatus.COMPLETED }),
      // Tính avg band score từ tất cả submission đã hoàn thành
      this.submissionModel.aggregate([
        { $match: { status: SubmissionStatus.COMPLETED, "aiResult.overallBand": { $exists: true } } },
        { $group: { _id: null, avg: { $avg: "$aiResult.overallBand" } } },
      ]),
    ]);

    const avgBandScore = avgBandResult.length > 0
      ? Math.round((avgBandResult[0].avg as number) * 10) / 10
      : 0;

    return {
      totalUsers,
      totalTopics,
      totalCourses,
      totalExamQuestions,
      totalSampleEssays,
      totalSubmissions,
      completedSubmissions,
      avgBandScore,
    };
  }

  /*
  Lấy danh sách submissions của một user cụ thể (admin only).
  Input:
    - userId — id của user cần xem
    - page, limit — phân trang
  */
  async getUserSubmissions(userId: string, page: number = 1, limit: number = 10) {
    const filter = { userId: new Types.ObjectId(userId) };
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
  Lấy chi tiết một submission để admin rà soát chất lượng chấm AI.
  Input:
    - submissionId — id bài nộp
  */
  async getSubmissionDetail(submissionId: string) {
    const submission = await this.submissionModel
      .findById(submissionId)
      .populate("questionId", "title questionPrompt")
      .populate("userId", "fullName email role isActive")
      .exec();

    if (!submission) {
      throw new NotFoundException("Không tìm thấy submission");
    }

    return submission;
  }
}
