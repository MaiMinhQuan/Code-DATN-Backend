// Service CRUD SampleEssay: filter, tăng view, soft-delete (ẩn).
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

  /*
  Danh sách bài mẫu (chỉ isPublished=true), có thể filter theo topic/band
  Input:
    - topicId — id topic (optional)
    - targetBand — band (optional)
   */
  async findAll(topicId?: string, targetBand?: TargetBand): Promise<SampleEssay[]> {
    const filter: any = { isPublished: true }; // students only see published essays

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
      .sort({ favoriteCount: -1, createdAt: -1 }) // most-favorited first, then newest
      .exec();
  }

  /*
  Chi tiết bài mẫu theo id
  Input:
    - id — id essay
   */
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

  /*
  Tăng viewCount +1 (atomic)
  Input:
    - id — id essay
   */
  async incrementViewCount(id: string): Promise<{ viewCount: number }> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException("ID không hợp lệ");
    }

    const essay = await this.sampleEssayModel
      .findByIdAndUpdate(
        id,
        { $inc: { viewCount: 1 } },
        { new: true }, // trả về document sau update
      )
      .exec();

    if (!essay) {
      throw new NotFoundException("Không tìm thấy bài mẫu");
    }

    return { viewCount: essay.viewCount };
  }

  /*
  Tạo bài mẫu mới (validate topicId tồn tại)
  Input:
    - createDto — body request
   */
  async create(createDto: CreateSampleEssayDto): Promise<SampleEssay> {
    // Verify the topic document exists before creating the essay
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

  /*
  Cập nhật bài mẫu (validate topicId nếu đổi)
  Input:
    - id — id essay
    - updateDto — body request
   */
  async update(id: string, updateDto: UpdateSampleEssayDto): Promise<SampleEssay> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException("ID không hợp lệ");
    }

    const dto = updateDto as any;

    // Nếu đổi topicId thì validate topic tồn tại
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

  /*
  Ẩn bài mẫu (soft-delete: isPublished=false)
  Input:
    - id — id essay
   */
  async remove(id: string): Promise<{ message: string }> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException("ID không hợp lệ");
    }

    // Soft delete: chỉ ẩn bằng isPublished=false
    const essay = await this.sampleEssayModel
      .findByIdAndUpdate(id, { isPublished: false }, { new: true })
      .exec();

    if (!essay) {
      throw new NotFoundException("Không tìm thấy bài mẫu");
    }

    return { message: "Đã ẩn bài mẫu thành công" };
  }
}
