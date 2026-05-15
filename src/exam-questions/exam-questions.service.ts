// Service CRUD ExamQuestion + filter + random
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

  /*
  Danh sách đề thi theo filter (mặc định isPublished=true nếu không truyền)
  Input:
    - query — query params
   */
  async findAll(query: QueryExamQuestionDto): Promise<ExamQuestion[]> {
    const filter: any = {};

    if (query.topicId) {
      if (!Types.ObjectId.isValid(query.topicId)) {
        throw new BadRequestException("topicId không hợp lệ");
      }
      filter.topicId = new Types.ObjectId(query.topicId);
    }

    if (query.difficultyLevel !== undefined) {
      filter.difficultyLevel = query.difficultyLevel;
    }

    // Mặc định chỉ lấy đề đã published khi caller không truyền giá trị
    if (query.isPublished !== undefined) {
      filter.isPublished = query.isPublished;
    } else {
      filter.isPublished = true;
    }

    if (query.tag) {
      filter.tags = query.tag; // khớp các document có mảng tags chứa giá trị này
    }

    return this.examQuestionModel
      .find(filter)
      .populate("topicId", "name slug")
      .sort({ createdAt: -1 })
      .exec();
  }

  /*
  Chi tiết đề thi theo id
  Input:
    - id — id question
   */
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

  /*
  Lấy đề ngẫu nhiên (đã published), có thể lọc theo topicId
  Input:
    - topicId — id topic (optional)
   */
  async getRandomQuestion(topicId?: string): Promise<ExamQuestion> {
    const filter: any = { isPublished: true };

    if (topicId) {
      if (!Types.ObjectId.isValid(topicId)) {
        throw new BadRequestException("topicId không hợp lệ");
      }
      filter.topicId = new Types.ObjectId(topicId);
    }

    const count = await this.examQuestionModel.countDocuments(filter).exec();

    if (count === 0) {
      throw new NotFoundException("Không có đề thi nào phù hợp");
    }

    // Sinh số ngẫu nhiên rồi skip đến document đó
    const randomIndex = Math.floor(Math.random() * count);
    const randomQuestion = await this.examQuestionModel
      .findOne(filter)
      .skip(randomIndex)
      .populate("topicId", "name slug")
      .exec();

    return randomQuestion;
  }

  /*
  Tạo đề thi mới
  Input:
    - createDto — body request
   */
  async create(createDto: CreateExamQuestionDto): Promise<ExamQuestion> {
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
      attemptCount: 0, // khởi tạo bằng 0 khi tạo mới
    });

    await newQuestion.save();

    // Truy vấn lại để trả về document đã populate
    return this.examQuestionModel
      .findById(newQuestion._id)
      .populate("topicId", "name slug")
      .exec();
  }

  /*
  Cập nhật đề thi (convert topicId string → ObjectId nếu có)
  Input:
    - id — id question
    - updateDto — body request
   */
  async update(id: string, updateDto: UpdateExamQuestionDto): Promise<ExamQuestion> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException("id không hợp lệ");
    }

    const updateData: any = { ...updateDto };

    // Chuyển chuỗi topicId thành ObjectId nếu được cung cấp
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

  /*
  Xóa đề thi vĩnh viễn
  Input:
    - id — id question
   */
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

  /*
  Tăng attemptCount +1 (atomic)
  Input:
    - id — id question
   */
  async incrementAttemptCount(id: string): Promise<void> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException("id không hợp lệ");
    }

    await this.examQuestionModel
      .findByIdAndUpdate(id, { $inc: { attemptCount: 1 } })
      .exec();
  }
}
