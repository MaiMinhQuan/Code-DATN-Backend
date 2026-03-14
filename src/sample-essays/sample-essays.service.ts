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

  // ====================================
  // 1. findAll - Lọc bài mẫu
  // ====================================
  // Query params: topicId (optional), targetBand (optional)
  // Logic:
  //   - Tạo filter object rỗng
  //   - Nếu có topicId → thêm vào filter (validate ObjectId trước)
  //   - Nếu có targetBand → thêm vào filter
  //   - Mặc định chỉ lấy isPublished = true
  //   - Sort theo favoriteCount DESC, createdAt DESC
  //   - Populate topicId để lấy name, slug
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

  // ====================================
  // 2. findOne - Chi tiết bài mẫu
  // ====================================
  // Logic:
  //   - Validate ObjectId
  //   - Tìm bài mẫu theo id
  //   - Populate topicId
  //   - Nếu không tìm thấy → throw NotFoundException
  //   - Return bài mẫu (bao gồm highlightAnnotations)
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

  // ====================================
  // 3. incrementViewCount - Tăng lượt xem
  // ====================================
  // Logic:
  //   - Validate ObjectId
  //   - Dùng findByIdAndUpdate với $inc: { viewCount: 1 }
  //   - Return { viewCount: newValue }
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

  // ====================================
  // 4. create - Tạo bài mẫu mới (Admin only)
  // ====================================
  // Logic:
  //   - Kiểm tra Topic có tồn tại không (query topics collection)
  //   - Tạo document mới từ DTO
  //   - viewCount và favoriteCount mặc định = 0
  //   - Save và return
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

  // ====================================
  // 5. update - Cập nhật bài mẫu (Admin only)
  // ====================================
  // Logic:
  //   - Validate ObjectId
  //   - Nếu update topicId → kiểm tra topic mới tồn tại
  //   - findByIdAndUpdate với { new: true }
  //   - Nếu không tìm thấy → throw NotFoundException
  async update(id: string, updateDto: UpdateSampleEssayDto): Promise<SampleEssay> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException("ID không hợp lệ");
    }

    // Nếu update topicId, kiểm tra topic mới tồn tại
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

  // ====================================
  // 6. remove - Xóa bài mẫu (Admin only)
  // ====================================
  // Logic:
  //   - Validate ObjectId
  //   - Soft delete: Đổi isPublished = false (khuyến nghị)
  //   - Hoặc Hard delete: findByIdAndDelete
  //   - Return message success
  async remove(id: string): Promise<{ message: string }> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException("ID không hợp lệ");
    }

    // Option A: Soft delete
    const essay = await this.sampleEssayModel
      .findByIdAndUpdate(id, { isPublished: false }, { new: true })
      .exec();

    // Option B: Hard delete
    // const essay = await this.sampleEssayModel.findByIdAndDelete(id).exec();

    if (!essay) {
      throw new NotFoundException("Không tìm thấy bài mẫu");
    }

    return { message: "Đã ẩn bài mẫu thành công" };
  }
}
