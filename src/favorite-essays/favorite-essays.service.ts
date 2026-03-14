import { Injectable, NotFoundException, BadRequestException, ConflictException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { FavoriteEssay, FavoriteEssayDocument } from "../schemas/favorite-essay.schema";
import { SampleEssay, SampleEssayDocument } from "../schemas/sample-essay.schema";

@Injectable()
export class FavoriteEssaysService {
  constructor(
    @InjectModel(FavoriteEssay.name) private favoriteEssayModel: Model<FavoriteEssayDocument>,
    @InjectModel(SampleEssay.name) private sampleEssayModel: Model<SampleEssayDocument>,
  ) {}

  // Thêm bài mẫu vào danh sách yêu thích
  async addFavorite(userId: string, essayId: string, personalNote?: string): Promise<FavoriteEssay> {
    if (!Types.ObjectId.isValid(essayId)) {
      throw new BadRequestException("essayId không hợp lệ");
    }

    // Kiểm tra bài mẫu có tồn tại không
    const essayExists = await this.sampleEssayModel.findById(essayId).exec();
    if (!essayExists) {
      throw new NotFoundException(`Không tìm thấy bài mẫu với ID: ${essayId}`);
    }

    // Kiểm tra đã thả tim chưa
    const existingFavorite = await this.favoriteEssayModel
      .findOne({
        userId: new Types.ObjectId(userId),
        essayId: new Types.ObjectId(essayId),
      })
      .exec();

    if (existingFavorite) {
      throw new ConflictException("Bài mẫu này đã có trong danh sách yêu thích");
    }

    // Tạo mới favorite (đúng theo schema)
    const newFavorite = new this.favoriteEssayModel({
      userId: new Types.ObjectId(userId),
      essayId: new Types.ObjectId(essayId),
      personalNote: personalNote || undefined,
    });

    await newFavorite.save();

    // Tăng favoriteCount trong SampleEssay
    await this.sampleEssayModel.findByIdAndUpdate(essayId, {
      $inc: { favoriteCount: 1 },
    });

    // Populate và trả về
    return this.favoriteEssayModel
      .findById(newFavorite._id)
      .populate({
        path: "essayId",
        select: "title topicId targetBand outlineContent viewCount favoriteCount questionPrompt",
        populate: {
          path: "topicId",
          select: "name slug description",
        },
      })
      .exec();
  }

  // Xóa bài mẫu khỏi danh sách yêu thích
  async removeFavorite(userId: string, essayId: string): Promise<{ message: string }> {
    if (!Types.ObjectId.isValid(essayId)) {
      throw new BadRequestException("essayId không hợp lệ");
    }

    const result = await this.favoriteEssayModel
      .findOneAndDelete({
        userId: new Types.ObjectId(userId),
        essayId: new Types.ObjectId(essayId),
      })
      .exec();

    if (!result) {
      throw new NotFoundException("Bài mẫu không có trong danh sách yêu thích");
    }

    // Giảm favoriteCount trong SampleEssay
    await this.sampleEssayModel.findByIdAndUpdate(essayId, {
      $inc: { favoriteCount: -1 },
    });

    return { message: "Đã xóa bài mẫu khỏi danh sách yêu thích" };
  }

  // Lấy danh sách tất cả bài mẫu yêu thích của user
  async getFavorites(userId: string): Promise<FavoriteEssay[]> {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException("userId không hợp lệ");
    }

    return this.favoriteEssayModel
      .find({ userId: new Types.ObjectId(userId) })
      .populate({
        path: "essayId",
        select: "title topicId targetBand outlineContent viewCount favoriteCount questionPrompt",
        populate: {
          path: "topicId",
          select: "name slug description",
        },
      })
      .sort({ createdAt: -1 }) // Mới nhất trước
      .exec();
  }

  // Kiểm tra user đã thả tim bài mẫu này chưa
  async isFavorite(userId: string, essayId: string): Promise<boolean> {
    if (!Types.ObjectId.isValid(userId) || !Types.ObjectId.isValid(essayId)) {
      return false;
    }

    const count = await this.favoriteEssayModel
      .countDocuments({
        userId: new Types.ObjectId(userId),
        essayId: new Types.ObjectId(essayId),
      })
      .exec();

    return count > 0;
  }
}
