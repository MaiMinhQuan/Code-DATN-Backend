// Service bookmark bài mẫu: add/remove/list/check và đồng bộ favoriteCount.
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

  /*
  Thêm bài mẫu vào yêu thích (tăng favoriteCount), chặn favorite trùng
  Input:
    - userId — id user
    - essayId — id essay
    - personalNote — note (optional)
   */
  async addFavorite(userId: string, essayId: string, personalNote?: string): Promise<FavoriteEssay> {
    if (!Types.ObjectId.isValid(essayId)) {
      throw new BadRequestException("essayId không hợp lệ");
    }

    // Validate essay tồn tại
    const essayExists = await this.sampleEssayModel.findById(essayId).exec();
    if (!essayExists) {
      throw new NotFoundException(`Không tìm thấy bài mẫu với ID: ${essayId}`);
    }

    // Chặn bookmark trùng
    const existingFavorite = await this.favoriteEssayModel
      .findOne({
        userId: new Types.ObjectId(userId),
        essayId: new Types.ObjectId(essayId),
      })
      .exec();

    if (existingFavorite) {
      throw new ConflictException("Bài mẫu này đã có trong danh sách yêu thích");
    }

    const newFavorite = new this.favoriteEssayModel({
      userId: new Types.ObjectId(userId),
      essayId: new Types.ObjectId(essayId),
      personalNote: personalNote || undefined,
    });

    await newFavorite.save();

    // Đồng bộ favoriteCount
    await this.sampleEssayModel.findByIdAndUpdate(essayId, {
      $inc: { favoriteCount: 1 },
    });

    // Trả về document đã populate essay/topic
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

  /*
  Xóa khỏi yêu thích (giảm favoriteCount)
  Input:
    - userId — id user
    - essayId — id essay
   */
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

    // Đồng bộ favoriteCount sau khi xóa
    await this.sampleEssayModel.findByIdAndUpdate(essayId, {
      $inc: { favoriteCount: -1 },
    });

    return { message: "Đã xóa bài mẫu khỏi danh sách yêu thích" };
  }

  /*
  Danh sách bài mẫu yêu thích của user (mới nhất trước)
  Input:
    - userId — id user
   */
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
      .sort({ createdAt: -1 })
      .exec();
  }

  /*
  Check user đã favorite essay chưa
  Input:
    - userId — id user
    - essayId — id essay
   */
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
