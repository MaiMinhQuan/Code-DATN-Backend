// Service CRUD SampleEssay: filter, soft-delete (ẩn).
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
  async findAll(topicId?: string, targetBand?: TargetBand, isPublished?: boolean): Promise<SampleEssay[]> {
    const filter: any = {};

    if (isPublished !== undefined) {
      filter.isPublished = isPublished;
    }

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
  Tạo bài mẫu mới (validate topicId tồn tại)
  Input:
    - createDto — body request
   */
  private calcTargetBand(score: number): TargetBand {
    if (score >= 7.0) return TargetBand.BAND_7_PLUS;
    if (score >= 6.0) return TargetBand.BAND_6_0;
    return TargetBand.BAND_5_0;
  }

  async create(createDto: CreateSampleEssayDto): Promise<SampleEssay> {
    // Verify the topic document exists before creating the essay
    const topicExists = await this.sampleEssayModel.db
      .collection("topics")
      .findOne({ _id: new Types.ObjectId(createDto.topicId) });

    if (!topicExists) {
      throw new BadRequestException("Topic không tồn tại");
    }

    const dto = createDto as any;
    if (dto.overallBandScore > 0) {
      dto.targetBand = this.calcTargetBand(Number(dto.overallBandScore));
    }

    const newEssay = new this.sampleEssayModel({
      ...dto,
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

    if (dto.overallBandScore > 0) {
      dto.targetBand = this.calcTargetBand(Number(dto.overallBandScore));
    }

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
