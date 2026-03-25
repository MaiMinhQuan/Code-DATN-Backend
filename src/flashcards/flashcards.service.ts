import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { FlashcardSet, FlashcardSetDocument } from "../schemas/flashcard-set.schema";
import { Flashcard, FlashcardDocument } from "../schemas/flashcard.schema";
import { CreateFlashcardSetDto } from "./dto/create-flashcard-set.dto";
import { UpdateFlashcardSetDto } from "./dto/update-flashcard-set.dto";
import { CreateFlashcardDto } from "./dto/create-flashcard.dto";
import { UpdateFlashcardDto } from "./dto/update-flashcard.dto";
import { UpdateReviewDto } from "./dto/update-review.dto";

@Injectable()
export class FlashcardsService {
  constructor(
    @InjectModel(FlashcardSet.name) private flashcardSetModel: Model<FlashcardSetDocument>,
    @InjectModel(Flashcard.name) private flashcardModel: Model<FlashcardDocument>,
  ) {}

  /* FLASHCARD SET METHODS*/

  // Lấy tất cả bộ thẻ của user
  // userId: ID của user
  async findAllSets(userId: string): Promise<FlashcardSet[]> {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException("userId không hợp lệ");
    }

    return this.flashcardSetModel
      .find({ userId: new Types.ObjectId(userId) })
      .sort({ createdAt: -1 })
      .exec();
  }

  // Lấy chi tiết bộ thẻ kèm theo các cards
  // setId: ID của bộ thẻ
  // userId: ID của user
  async findSetWithCards(setId: string, userId: string): Promise<{ set: FlashcardSet; cards: Flashcard[] }> {
    if (!Types.ObjectId.isValid(setId)) {
      throw new BadRequestException("setId không hợp lệ");
    }
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException("userId không hợp lệ");
    }

    // Tìm set và kiểm tra quyền sở hữu
    const set = await this.flashcardSetModel
      .findOne({
        _id: new Types.ObjectId(setId),
        userId: new Types.ObjectId(userId),
      })
      .exec();

    if (!set) {
      throw new NotFoundException(`Không tìm thấy bộ thẻ với ID: ${setId}`);
    }

    // Lấy tất cả cards của set
    const cards = await this.flashcardModel
      .find({ setId: new Types.ObjectId(setId) })
      .sort({ createdAt: 1 })
      .exec();

    return { set, cards };
  }

  // Tạo bộ thẻ mới
  // userId: ID của user
  // createSetDto: Dữ liệu tạo bộ thẻ mới (chứa title và description)
  async createSet(userId: string, createSetDto: CreateFlashcardSetDto): Promise<FlashcardSet> {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException("userId không hợp lệ");
    }

    const newSet = new this.flashcardSetModel({
      userId: new Types.ObjectId(userId),
      title: createSetDto.title,
      description: createSetDto.description || undefined,
    });

    return newSet.save();
  }

  // Cập nhật bộ thẻ
  // setId: ID của bộ thẻ
  // userId: ID của user
  // updateSetDto: Dữ liệu cập nhật cho bộ thẻ (chứa title và description)
  async updateSet(setId: string, userId: string, updateSetDto: UpdateFlashcardSetDto): Promise<FlashcardSet> {
    if (!Types.ObjectId.isValid(setId)) {
      throw new BadRequestException("setId không hợp lệ");
    }
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException("userId không hợp lệ");
    }

    const updatedSet = await this.flashcardSetModel
      .findOneAndUpdate(
        {
          _id: new Types.ObjectId(setId),
          userId: new Types.ObjectId(userId),
        },
        { $set: updateSetDto },
        { new: true },
      )
      .exec();

    if (!updatedSet) {
      throw new NotFoundException(`Không tìm thấy bộ thẻ với ID: ${setId}`);
    }

    return updatedSet;
  }

  // Xóa bộ thẻ (và tất cả cards bên trong)
  // setId: ID của bộ thẻ
  // userId: ID của user
  async deleteSet(setId: string, userId: string): Promise<{ message: string }> {
    if (!Types.ObjectId.isValid(setId)) {
      throw new BadRequestException("setId không hợp lệ");
    }
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException("userId không hợp lệ");
    }

    const deletedSet = await this.flashcardSetModel
      .findOneAndDelete({
        _id: new Types.ObjectId(setId),
        userId: new Types.ObjectId(userId),
      })
      .exec();

    if (!deletedSet) {
      throw new NotFoundException(`Không tìm thấy bộ thẻ với ID: ${setId}`);
    }

    // Xóa tất cả cards trong set
    await this.flashcardModel.deleteMany({ setId: new Types.ObjectId(setId) }).exec();

    return { message: "Đã xóa bộ thẻ và tất cả thẻ bên trong thành công" };
  }


  /* FLASHCARD METHODS */

  // Thêm card vào bộ thẻ
  // setId: ID của bộ thẻ
  // userId: ID của user
  // createCardDto: Dữ liệu tạo card mới
  async addCard(setId: string, userId: string, createCardDto: CreateFlashcardDto): Promise<Flashcard> {
    if (!Types.ObjectId.isValid(setId)) {
      throw new BadRequestException("setId không hợp lệ");
    }
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException("userId không hợp lệ");
    }

    // Kiểm tra set có tồn tại và thuộc về user không
    const setExists = await this.flashcardSetModel
      .findOne({
        _id: new Types.ObjectId(setId),
        userId: new Types.ObjectId(userId),
      })
      .exec();

    if (!setExists) {
      throw new NotFoundException(`Không tìm thấy bộ thẻ với ID: ${setId}`);
    }

    const newCard = new this.flashcardModel({
      setId: new Types.ObjectId(setId),
      frontContent: createCardDto.frontContent,
      backContent: createCardDto.backContent,
      nextReviewDate: createCardDto.nextReviewDate || undefined,
      reviewCount: 0,
    });

    return newCard.save();
  }

  // Cập nhật card
  // cardId: ID của card
  // userId: ID của user
  // updateCardDto: Dữ liệu cập nhật cho card
  async updateCard(cardId: string, userId: string, updateCardDto: UpdateFlashcardDto): Promise<Flashcard> {
    if (!Types.ObjectId.isValid(cardId)) {
      throw new BadRequestException("cardId không hợp lệ");
    }
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException("userId không hợp lệ");
    }

    // Tìm card
    const card = await this.flashcardModel.findById(cardId).exec();
    if (!card) {
      throw new NotFoundException(`Không tìm thấy thẻ với ID: ${cardId}`);
    }

    // Kiểm tra quyền sở hữu thông qua set
    const set = await this.flashcardSetModel
      .findOne({
        _id: card.setId,
        userId: new Types.ObjectId(userId),
      })
      .exec();

    if (!set) {
      throw new ForbiddenException("Bạn không có quyền chỉnh sửa thẻ này");
    }

    // Cập nhật card
    const updatedCard = await this.flashcardModel
      .findByIdAndUpdate(cardId, { $set: updateCardDto }, { new: true })
      .exec();

    return updatedCard;
  }

  // Xóa card
  // cardId: ID của card
  // userId: ID của user
  async deleteCard(cardId: string, userId: string): Promise<{ message: string }> {
    if (!Types.ObjectId.isValid(cardId)) {
      throw new BadRequestException("cardId không hợp lệ");
    }
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException("userId không hợp lệ");
    }

    // Tìm card
    const card = await this.flashcardModel.findById(cardId).exec();
    if (!card) {
      throw new NotFoundException(`Không tìm thấy thẻ với ID: ${cardId}`);
    }

    // Kiểm tra quyền sở hữu thông qua set
    const set = await this.flashcardSetModel
      .findOne({
        _id: card.setId,
        userId: new Types.ObjectId(userId),
      })
      .exec();

    if (!set) {
      throw new ForbiddenException("Bạn không có quyền xóa thẻ này");
    }

    // Xóa card
    await this.flashcardModel.findByIdAndDelete(cardId).exec();

    return { message: "Đã xóa thẻ thành công" };
  }

  // Cập nhật lịch ôn tập (Spaced Repetition - SM-2 Algorithm đơn giản)
  // cardId: ID của card
  // userId: ID của user
  // updateReviewDto: Dữ liệu cập nhật kết quả ôn tập (chứa quality từ 0-5)
  async updateReviewSchedule(cardId: string, userId: string, updateReviewDto: UpdateReviewDto): Promise<Flashcard> {
    if (!Types.ObjectId.isValid(cardId)) {
      throw new BadRequestException("cardId không hợp lệ");
    }
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException("userId không hợp lệ");
    }

    // Tìm card
    const card = await this.flashcardModel.findById(cardId).exec();
    if (!card) {
      throw new NotFoundException(`Không tìm thấy thẻ với ID: ${cardId}`);
    }

    // Kiểm tra quyền sở hữu thông qua set
    const set = await this.flashcardSetModel
      .findOne({
        _id: card.setId,
        userId: new Types.ObjectId(userId),
      })
      .exec();

    if (!set) {
      throw new ForbiddenException("Bạn không có quyền cập nhật thẻ này");
    }

    // Tính toán ngày ôn tập tiếp theo dựa trên quality (SM-2 đơn giản)
    const { quality } = updateReviewDto;
    const newReviewCount = card.reviewCount + 1;
    let daysUntilNextReview: number;

    if (quality < 3) {
      // Trả lời sai hoặc khó nhớ -> ôn lại sớm
      daysUntilNextReview = 1;
    } else {
      // Trả lời đúng -> tăng khoảng cách ôn tập
      switch (newReviewCount) {
        case 1:
          daysUntilNextReview = 1;
          break;
        case 2:
          daysUntilNextReview = 3;
          break;
        case 3:
          daysUntilNextReview = 7;
          break;
        case 4:
          daysUntilNextReview = 14;
          break;
        case 5:
          daysUntilNextReview = 30;
          break;
        default:
          daysUntilNextReview = Math.min(60, newReviewCount * 7);
      }

      // Điều chỉnh theo quality
      if (quality === 5) {
        daysUntilNextReview = Math.ceil(daysUntilNextReview * 1.3);
      } else if (quality === 3) {
        daysUntilNextReview = Math.ceil(daysUntilNextReview * 0.8);
      }
    }

    const nextReviewDate = new Date();
    nextReviewDate.setDate(nextReviewDate.getDate() + daysUntilNextReview);

    // Cập nhật card
    const updatedCard = await this.flashcardModel
      .findByIdAndUpdate(
        cardId,
        {
          $set: { nextReviewDate },
          $inc: { reviewCount: 1 },
        },
        { new: true },
      )
      .exec();

    return updatedCard;
  }

  // Lấy các thẻ cần ôn tập hôm nay
  // userId: ID của user
  async getCardsForReview(userId: string): Promise<Flashcard[]> {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException("userId không hợp lệ");
    }

    // Lấy tất cả set của user
    const userSets = await this.flashcardSetModel
      .find({ userId: new Types.ObjectId(userId) })
      .select("_id")
      .exec();

    const setIds = userSets.map((set) => set._id);

    // Lấy các cards có nextReviewDate <= hôm nay hoặc chưa có nextReviewDate
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    return this.flashcardModel
      .find({
        setId: { $in: setIds },
        $or: [
          { nextReviewDate: { $lte: today } },
          { nextReviewDate: null },
          { nextReviewDate: { $exists: false } },
        ],
      })
      .populate("setId", "title")
      .sort({ nextReviewDate: 1 })
      .exec();
  }
}
