// Service CRUD flashcard set/cards và ghi nhận lượt ôn tập
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

  /*
  Danh sách flashcard set của user (kèm cardCount và dueCount)
  Input:
    - userId — id user
   */
  async findAllSets(userId: string): Promise<(FlashcardSet & { cardCount: number })[]> {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException("userId không hợp lệ");
    }

    const sets = await this.flashcardSetModel
      .find({ userId: new Types.ObjectId(userId) })
      .sort({ createdAt: -1 })
      .lean()
      .exec();

    if (sets.length === 0) return [];

    const setIds = sets.map((s) => s._id);

    const cardCounts = await this.flashcardModel.aggregate([
      { $match: { setId: { $in: setIds } } },
      { $group: { _id: "$setId", count: { $sum: 1 } } },
    ]);

    const cardCountMap = new Map<string, number>(
      cardCounts.map((c) => [c._id.toString(), c.count]),
    );

    return sets.map((set) => ({
      ...set,
      cardCount: cardCountMap.get(set._id.toString()) ?? 0,
    }));
  }

  /*
  Chi tiết set + cards (check ownership)
  Input:
    - setId — id set
    - userId — id user
   */
  async findSetWithCards(setId: string, userId: string): Promise<{ set: FlashcardSet; cards: Flashcard[] }> {
    if (!Types.ObjectId.isValid(setId)) {
      throw new BadRequestException("setId không hợp lệ");
    }
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException("userId không hợp lệ");
    }

    // Check ownership bằng _id + userId
    const set = await this.flashcardSetModel
      .findOne({
        _id: new Types.ObjectId(setId),
        userId: new Types.ObjectId(userId),
      })
      .exec();

    if (!set) {
      throw new NotFoundException(`Không tìm thấy bộ thẻ với ID: ${setId}`);
    }

    const cards = await this.flashcardModel
      .find({ setId: new Types.ObjectId(setId) })
      .sort({ createdAt: 1 })
      .exec();

    return { set, cards };
  }

  /*
  Tạo flashcard set mới
  Input:
    - userId — id user
    - createSetDto — body request
   */
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

  /*
  Cập nhật flashcard set (owner-only)
  Input:
    - setId — id set
    - userId — id user
    - updateSetDto — body request
   */
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

  /*
  Xóa flashcard set và xóa cascade toàn bộ cards
  Input:
    - setId — id set
    - userId — id user
   */
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

    // Cascade-delete cards thuộc set
    await this.flashcardModel.deleteMany({ setId: new Types.ObjectId(setId) }).exec();

    return { message: "Đã xóa bộ thẻ và tất cả thẻ bên trong thành công" };
  }

  /*
  Thêm card vào set (check ownership)
  Input:
    - setId — id set
    - userId — id user
    - createCardDto — body request
   */
  async addCard(setId: string, userId: string, createCardDto: CreateFlashcardDto): Promise<Flashcard> {
    if (!Types.ObjectId.isValid(setId)) {
      throw new BadRequestException("setId không hợp lệ");
    }
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException("userId không hợp lệ");
    }

    // Validate set tồn tại và thuộc user
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

  /*
  Cập nhật card (check ownership theo set)
  Input:
    - cardId — id card
    - userId — id user
    - updateCardDto — body request
   */
  async updateCard(cardId: string, userId: string, updateCardDto: UpdateFlashcardDto): Promise<Flashcard> {
    if (!Types.ObjectId.isValid(cardId)) {
      throw new BadRequestException("cardId không hợp lệ");
    }
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException("userId không hợp lệ");
    }

    const card = await this.flashcardModel.findById(cardId).exec();
    if (!card) {
      throw new NotFoundException(`Không tìm thấy thẻ với ID: ${cardId}`);
    }

    // Check ownership qua parent set
    const set = await this.flashcardSetModel
      .findOne({
        _id: card.setId,
        userId: new Types.ObjectId(userId),
      })
      .exec();

    if (!set) {
      throw new ForbiddenException("Bạn không có quyền chỉnh sửa thẻ này");
    }

    const updatedCard = await this.flashcardModel
      .findByIdAndUpdate(cardId, { $set: updateCardDto }, { new: true })
      .exec();

    return updatedCard;
  }

  /*
  Xóa card (check ownership theo set)
  Input:
    - cardId — id card
    - userId — id user
   */
  async deleteCard(cardId: string, userId: string): Promise<{ message: string }> {
    if (!Types.ObjectId.isValid(cardId)) {
      throw new BadRequestException("cardId không hợp lệ");
    }
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException("userId không hợp lệ");
    }

    const card = await this.flashcardModel.findById(cardId).exec();
    if (!card) {
      throw new NotFoundException(`Không tìm thấy thẻ với ID: ${cardId}`);
    }

    // Check ownership qua parent set
    const set = await this.flashcardSetModel
      .findOne({
        _id: card.setId,
        userId: new Types.ObjectId(userId),
      })
      .exec();

    if (!set) {
      throw new ForbiddenException("Bạn không có quyền xóa thẻ này");
    }

    await this.flashcardModel.findByIdAndDelete(cardId).exec();

    return { message: "Đã xóa thẻ thành công" };
  }

  /*
  Ghi nhận lượt ôn tập — tăng reviewCount
  Input:
    - cardId — id card
    - userId — id user
   */
  async updateReviewSchedule(cardId: string, userId: string): Promise<Flashcard> {
    if (!Types.ObjectId.isValid(cardId)) {
      throw new BadRequestException("cardId không hợp lệ");
    }
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException("userId không hợp lệ");
    }

    const card = await this.flashcardModel.findById(cardId).exec();
    if (!card) {
      throw new NotFoundException(`Không tìm thấy thẻ với ID: ${cardId}`);
    }

    const set = await this.flashcardSetModel
      .findOne({ _id: card.setId, userId: new Types.ObjectId(userId) })
      .exec();

    if (!set) {
      throw new ForbiddenException("Bạn không có quyền cập nhật thẻ này");
    }

    const updatedCard = await this.flashcardModel
      .findByIdAndUpdate(cardId, { $inc: { reviewCount: 1 } }, { new: true })
      .exec();

    return updatedCard;
  }
}
