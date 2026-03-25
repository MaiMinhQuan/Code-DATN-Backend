import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { ExamQuestion, ExamQuestionDocument } from "../schemas/exam-question.schema";
import { CreateExamQuestionDto } from "./dto/create-exam-question.dto";
import { UpdateExamQuestionDto } from "./dto/update-exam-question.dto";
import { QueryExamQuestionDto } from "./dto/query-exam-question.dto";

@Injectable()
export class ExamQuestionsService {
  constructor(
    @InjectModel(ExamQuestion.name) private examQuestionModel: Model<ExamQuestionDocument>,
  ) {}

  // Lấy danh sách đề thi
  // query: chứa các tham số filter như topicId, difficultyLevel, isPublished, tag
  async findAll(query: QueryExamQuestionDto): Promise<ExamQuestion[]> {
    const filter: any = {};

    // Filter theo topicId
    if (query.topicId) {
      if (!Types.ObjectId.isValid(query.topicId)) {
        throw new BadRequestException("topicId không hợp lệ");
      }
      filter.topicId = new Types.ObjectId(query.topicId);
    }

    // Filter theo difficultyLevel
    if (query.difficultyLevel !== undefined) {
      filter.difficultyLevel = query.difficultyLevel;
    }

    // Filter theo isPublished (mặc định chỉ lấy published cho Student)
    if (query.isPublished !== undefined) {
      filter.isPublished = query.isPublished;
    } else {
      filter.isPublished = true; // Mặc định chỉ lấy đề đã publish
    }

    // Filter theo tag
    if (query.tag) {
      filter.tags = query.tag;
    }

    return this.examQuestionModel
      .find(filter)
      .populate("topicId", "name slug")
      .sort({ createdAt: -1 })
      .exec();
  }

  // Lấy chi tiết đề thi
  // id: ID của đề thi
  async findOne(id: string): Promise<ExamQuestion> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException("id không hợp lệ");
    }

    const question = await this.examQuestionModel
      .findById(id)
      .populate("topicId", "name slug description")
      .exec();

    if (!question) {
      throw new NotFoundException(`Không tìm thấy đề thi với ID: ${id}`);
    }

    return question;
  }

  // Random 1 đề cho học viên luyện tập
  // topicId: ID của chủ đề (tùy chọn, nếu không có sẽ random trong tất cả đề đã publish)
  async getRandomQuestion(topicId?: string): Promise<ExamQuestion> {
    const filter: any = { isPublished: true };

    // Filter theo topicId nếu có
    if (topicId) {
      if (!Types.ObjectId.isValid(topicId)) {
        throw new BadRequestException("topicId không hợp lệ");
      }
      filter.topicId = new Types.ObjectId(topicId);
    }

    // Đếm tổng số đề phù hợp
    const count = await this.examQuestionModel.countDocuments(filter).exec();

    if (count === 0) {
      throw new NotFoundException("Không có đề thi nào phù hợp");
    }

    // Random 1 đề
    const randomIndex = Math.floor(Math.random() * count);
    const randomQuestion = await this.examQuestionModel
      .findOne(filter)
      .skip(randomIndex)
      .populate("topicId", "name slug")
      .exec();

    return randomQuestion;
  }

  // Tạo đề thi mới (Admin)
  // createDto: chứa dữ liệu đề thi mới
  async create(createDto: CreateExamQuestionDto): Promise<ExamQuestion> {
    // Validate topicId nếu có
    if (createDto.topicId && !Types.ObjectId.isValid(createDto.topicId)) {
      throw new BadRequestException("topicId không hợp lệ");
    }

    const newQuestion = new this.examQuestionModel({
      title: createDto.title,
      topicId: createDto.topicId ? new Types.ObjectId(createDto.topicId) : undefined,
      questionPrompt: createDto.questionPrompt,
      suggestedOutline: createDto.suggestedOutline || undefined,
      difficultyLevel: createDto.difficultyLevel || 0,
      isPublished: createDto.isPublished !== undefined ? createDto.isPublished : true,
      sourceReference: createDto.sourceReference || undefined,
      tags: createDto.tags || [],
      attemptCount: 0,
    });

    await newQuestion.save();

    // Populate và trả về
    return this.examQuestionModel
      .findById(newQuestion._id)
      .populate("topicId", "name slug")
      .exec();
  }

  // Cập nhật đề thi (Admin)
  // id: ID của đề thi cần cập nhật
  // updateDto: chứa dữ liệu cần cập nhật
  async update(id: string, updateDto: UpdateExamQuestionDto): Promise<ExamQuestion> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException("id không hợp lệ");
    }

    // Chuẩn bị data update
    const updateData: any = { ...updateDto };

    // Kiểm tra và convert topicId nếu có
    if ("topicId" in updateDto && updateDto["topicId"]) {
      if (!Types.ObjectId.isValid(updateDto["topicId"] as string)) {
        throw new BadRequestException("topicId không hợp lệ");
      }
      updateData.topicId = new Types.ObjectId(updateDto["topicId"] as string);
    }

    const updatedQuestion = await this.examQuestionModel
      .findByIdAndUpdate(id, { $set: updateData }, { new: true })
      .populate("topicId", "name slug")
      .exec();

    if (!updatedQuestion) {
      throw new NotFoundException(`Không tìm thấy đề thi với ID: ${id}`);
    }

    return updatedQuestion;
  }

  // Xóa đề thi (Admin)
  // id: ID của đề thi cần xóa
  async delete(id: string): Promise<{ message: string }> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException("id không hợp lệ");
    }

    const result = await this.examQuestionModel.findByIdAndDelete(id).exec();

    if (!result) {
      throw new NotFoundException(`Không tìm thấy đề thi với ID: ${id}`);
    }

    return { message: "Đã xóa đề thi thành công" };
  }

  // Tăng attemptCount khi học viên bắt đầu làm bài
  // id: ID của đề thi
  async incrementAttemptCount(id: string): Promise<void> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException("id không hợp lệ");
    }

    await this.examQuestionModel
      .findByIdAndUpdate(id, { $inc: { attemptCount: 1 } })
      .exec();
  }
}
