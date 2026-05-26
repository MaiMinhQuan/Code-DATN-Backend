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

  private applyBandFilter(
    filter: Record<string, unknown>,
    minBand?: number,
    maxBand?: number,
    legacyTargetBand?: TargetBand,
  ) {
    let min = minBand;
    let max = maxBand;

    if (legacyTargetBand && min === undefined && max === undefined) {
      if (legacyTargetBand === TargetBand.BAND_7_PLUS) {
        min = 7;
        max = 9;
      } else if (legacyTargetBand === TargetBand.BAND_6_0) {
        min = 6;
        max = 6.5;
      } else if (legacyTargetBand === TargetBand.BAND_5_0) {
        min = 0;
        max = 5.5;
      }
    }

    if (min !== undefined || max !== undefined) {
      const bandFilter: Record<string, number> = {};
      if (min !== undefined) bandFilter.$gte = min;
      if (max !== undefined) bandFilter.$lte = max;
      filter.overallBandScore = bandFilter;
    }
  }

  /*
  Danh sách bài mẫu, filter theo topic / overallBandScore (minBand, maxBand).
  */
  async findAll(
    topicId?: string,
    minBand?: number,
    maxBand?: number,
    legacyTargetBand?: TargetBand,
    isPublished?: boolean,
  ): Promise<SampleEssay[]> {
    const filter: Record<string, unknown> = {};

    if (isPublished !== undefined) {
      filter.isPublished = isPublished;
    }

    if (topicId) {
      if (!Types.ObjectId.isValid(topicId)) {
        throw new BadRequestException("topicId không hợp lệ");
      }
      filter.topicId = new Types.ObjectId(topicId);
    }

    this.applyBandFilter(filter, minBand, maxBand, legacyTargetBand);

    return this.sampleEssayModel
      .find(filter)
      .populate("topicId", "name slug")
      .sort({ favoriteCount: -1, createdAt: -1 })
      .exec();
  }

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

  async create(createDto: CreateSampleEssayDto): Promise<SampleEssay> {
    const topicExists = await this.sampleEssayModel.db
      .collection("topics")
      .findOne({ _id: new Types.ObjectId(createDto.topicId) });

    if (!topicExists) {
      throw new BadRequestException("Topic không tồn tại");
    }

    const newEssay = new this.sampleEssayModel({
      ...createDto,
      favoriteCount: 0,
    });

    return newEssay.save();
  }

  async update(id: string, updateDto: UpdateSampleEssayDto): Promise<SampleEssay> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException("ID không hợp lệ");
    }

    const dto = updateDto as CreateSampleEssayDto & UpdateSampleEssayDto;

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

  async remove(id: string): Promise<{ message: string }> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException("ID không hợp lệ");
    }

    const essay = await this.sampleEssayModel
      .findByIdAndUpdate(id, { isPublished: false }, { new: true })
      .exec();

    if (!essay) {
      throw new NotFoundException("Không tìm thấy bài mẫu");
    }

    return { message: "Đã ẩn bài mẫu thành công" };
  }
}
