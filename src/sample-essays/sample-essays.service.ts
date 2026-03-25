import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { SampleEssay, SampleEssayDocument } from "../schemas/sample-essay.schema";
import { CreateSampleEssayDto } from "./dto/create-sample-essay.dto";
import { UpdateSampleEssayDto } from "./dto/update-sample-essay.dto";
import { TargetBand } from "../common/enums";

@Injectable()
export class SampleEssaysService {
  constructor(
    @InjectModel(SampleEssay.name) private sampleEssayModel: Model<SampleEssayDocument>,
  ) {}

  // Lấy danh sách bài mẫu (chỉ published)
  // topicId: Filter theo topic
  // targetBand: Filter theo band điểm
  async findAll(topicId?: string, targetBand?: TargetBand): Promise<SampleEssay[]> {
    const filter: any = { isPublished: true };

    if (topicId) {
      if (!Types.ObjectId.isValid(topicId)) {
        throw new BadRequestException("topicId không hợp lệ");
      }
      filter.topicId = new Types.ObjectId(topicId);
    }

    if (targetBand) {
      filter.targetBand = targetBand;
    }

    return this.sampleEssayModel
      .find(filter)
      .populate("topicId", "name slug")
      .sort({ favoriteCount: -1, createdAt: -1 })
      .exec();
  }

  // Lấy chi tiết bài mẫu theo ID
  // id: ID của sample essay
  async findOne(id: string): Promise<SampleEssay> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException("ID không hợp lệ");
    }

    const essay = await this.sampleEssayModel
      .findById(id)
      .populate("topicId", "name slug description")
      .exec();

    if (!essay) {
      throw new NotFoundException("Không tìm thấy bài mẫu");
    }

    return essay;
  }

  // Tăng viewCount khi user xem bài mẫu
  // id: ID của sample essay
  async incrementViewCount(id: string): Promise<{ viewCount: number }> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException("ID không hợp lệ");
    }

    const essay = await this.sampleEssayModel
      .findByIdAndUpdate(
        id,
        { $inc: { viewCount: 1 } },
        { new: true }
      )
      .exec();

    if (!essay) {
      throw new NotFoundException("Không tìm thấy bài mẫu");
    }

    return { viewCount: essay.viewCount };
  }

  // Tạo bài mẫu mới (Admin)
  // createDto: Dữ liệu bài mẫu mới
  async create(createDto: CreateSampleEssayDto): Promise<SampleEssay> {
    // Kiểm tra topic tồn tại
    const topicExists = await this.sampleEssayModel.db
      .collection("topics")
      .findOne({ _id: new Types.ObjectId(createDto.topicId) });

    if (!topicExists) {
      throw new BadRequestException("Topic không tồn tại");
    }

    const newEssay = new this.sampleEssayModel({
      ...createDto,
      viewCount: 0,
      favoriteCount: 0,
    });

    return newEssay.save();
  }

  // Cập nhật bài mẫu (Admin)
  // id: ID của bài mẫu cần cập nhật
  // updateDto: Dữ liệu cập nhật
  async update(id: string, updateDto: UpdateSampleEssayDto): Promise<SampleEssay> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException("ID không hợp lệ");
    }

    // Kiểm tra topic mới tồn tại
    const dto = updateDto as any;

    if (dto.topicId) {
      const topicExists = await this.sampleEssayModel.db
        .collection("topics")
        .findOne({ _id: new Types.ObjectId(dto.topicId) });

      if (!topicExists) {
        throw new BadRequestException("Topic không tồn tại");
      }
    }

    const updatedEssay = await this.sampleEssayModel
      .findByIdAndUpdate(id, updateDto, { new: true })
      .populate("topicId", "name slug")
      .exec();

    if (!updatedEssay) {
      throw new NotFoundException("Không tìm thấy bài mẫu");
    }

    return updatedEssay;
  }

  // Xoá bài mẫu (Admin)
  // id: ID của bài mẫu cần xoá
  async remove(id: string): Promise<{ message: string }> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException("ID không hợp lệ");
    }

    // Soft delete
    const essay = await this.sampleEssayModel
      .findByIdAndUpdate(id, { isPublished: false }, { new: true })
      .exec();

    if (!essay) {
      throw new NotFoundException("Không tìm thấy bài mẫu");
    }

    return { message: "Đã ẩn bài mẫu thành công" };
  }
}
