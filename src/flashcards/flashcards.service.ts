// Service CRUD flashcard set/cards và ghi nhận lượt ôn tập
import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { FlashcardSet, FlashcardSetDocument } from "../schemas/flashcard-set.schema";
import { Flashcard, FlashcardDocument } from "../schemas/flashcard.schema";
import { Lesson, LessonDocument } from "../schemas/lesson.schema";
import { Course, CourseDocument } from "../schemas/course.schema";
import { CreateFlashcardSetDto } from "./dto/create-flashcard-set.dto";
import { UpdateFlashcardSetDto } from "./dto/update-flashcard-set.dto";
import { CreateFlashcardDto } from "./dto/create-flashcard.dto";
import { UpdateFlashcardDto } from "./dto/update-flashcard.dto";
import { UpdateReviewDto } from "./dto/update-review.dto";
import { FlashcardSetType } from "../common/enums";

@Injectable()
export class FlashcardsService {
  constructor(
    @InjectModel(FlashcardSet.name) private flashcardSetModel: Model<FlashcardSetDocument>,
    @InjectModel(Flashcard.name)    private flashcardModel:    Model<FlashcardDocument>,
    @InjectModel(Lesson.name)       private lessonModel:       Model<LessonDocument>,
    @InjectModel(Course.name)       private courseModel:       Model<CourseDocument>,
  ) {}

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  // Trả về Set<lessonId string> của các lesson có cả lesson lẫn course đã published.
  private async getPublishedLessonIds(lessonIds: Types.ObjectId[]): Promise<Set<string>> {
    if (lessonIds.length === 0) return new Set();

    const lessons = await this.lessonModel
      .find({ _id: { $in: lessonIds }, isPublished: true })
      .select("_id courseId")
      .lean()
      .exec();

    if (lessons.length === 0) return new Set();

    const courseIds = lessons.map((l) => (l as any).courseId);
    const publishedCourses = await this.courseModel
      .find({ _id: { $in: courseIds }, isPublished: true })
      .select("_id")
      .lean()
      .exec();

    const publishedCourseIds = new Set(publishedCourses.map((c) => c._id.toString()));

    return new Set(
      lessons
        .filter((l) => publishedCourseIds.has((l as any).courseId.toString()))
        .map((l) => l._id.toString()),
    );
  }

  // Kiểm tra set LESSON có accessible không (lesson+course đều published).
  private async assertLessonSetAccessible(set: FlashcardSet & { _id: any; lessonId?: any }): Promise<void> {
    if (!set.lessonId) {
      throw new ForbiddenException("Bộ thẻ bài học không hợp lệ");
    }
    const publishedIds = await this.getPublishedLessonIds([set.lessonId]);
    if (!publishedIds.has(set.lessonId.toString())) {
      throw new ForbiddenException("Bộ thẻ này hiện chưa được công bố");
    }
  }

  // ─── Sets ────────────────────────────────────────────────────────────────────

  /*
  Danh sách flashcard set của user:
  - PERSONAL: chỉ set do user tạo
  - LESSON: tất cả set gắn lesson+course đã published
  */
  async findAllSets(userId: string): Promise<(FlashcardSet & { cardCount: number })[]> {
    if (!Types.ObjectId.isValid(userId)) throw new BadRequestException("userId không hợp lệ");

    // PERSONAL: của user hiện tại
    const personalSets = await this.flashcardSetModel
      .find({ type: FlashcardSetType.PERSONAL, userId: new Types.ObjectId(userId) })
      .sort({ createdAt: -1 })
      .lean()
      .exec();

    // LESSON: lọc theo published lesson+course
    const allLessonSets = await this.flashcardSetModel
      .find({ type: FlashcardSetType.LESSON })
      .sort({ createdAt: -1 })
      .lean()
      .exec();

    const lessonIds = allLessonSets
      .filter((s) => s.lessonId)
      .map((s) => s.lessonId as Types.ObjectId);

    const publishedLessonIds = await this.getPublishedLessonIds(lessonIds);

    const visibleLessonSets = allLessonSets.filter(
      (s) => s.lessonId && publishedLessonIds.has(s.lessonId.toString()),
    );

    const sets = [...visibleLessonSets, ...personalSets];
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
    })) as any;
  }

  /*
  Chi tiết set + cards.
  PERSONAL: kiểm tra ownership. LESSON: kiểm tra lesson+course published.
  */
  async findSetWithCards(setId: string, userId: string): Promise<{ set: FlashcardSet; cards: Flashcard[] }> {
    if (!Types.ObjectId.isValid(setId)) throw new BadRequestException("setId không hợp lệ");
    if (!Types.ObjectId.isValid(userId)) throw new BadRequestException("userId không hợp lệ");

    const set = await this.flashcardSetModel.findById(setId).exec();
    if (!set) throw new NotFoundException(`Không tìm thấy bộ thẻ với ID: ${setId}`);

    if (set.type === FlashcardSetType.PERSONAL) {
      if (!set.userId || set.userId.toString() !== userId) {
        throw new ForbiddenException("Bạn không có quyền xem bộ thẻ này");
      }
    } else {
      await this.assertLessonSetAccessible(set as any);
    }

    const cards = await this.flashcardModel
      .find({ setId: new Types.ObjectId(setId) })
      .sort({ createdAt: 1 })
      .exec();

    return { set, cards };
  }

  /*
  Tạo flashcard set PERSONAL mới.
  */
  async createSet(userId: string, createSetDto: CreateFlashcardSetDto): Promise<FlashcardSet> {
    if (!Types.ObjectId.isValid(userId)) throw new BadRequestException("userId không hợp lệ");

    const newSet = new this.flashcardSetModel({
      type:        FlashcardSetType.PERSONAL,
      userId:      new Types.ObjectId(userId),
      title:       createSetDto.title,
      description: createSetDto.description || undefined,
    });

    return newSet.save();
  }

  /*
  Cập nhật set — chỉ PERSONAL và owner mới được sửa.
  */
  async updateSet(setId: string, userId: string, updateSetDto: UpdateFlashcardSetDto): Promise<FlashcardSet> {
    if (!Types.ObjectId.isValid(setId)) throw new BadRequestException("setId không hợp lệ");
    if (!Types.ObjectId.isValid(userId)) throw new BadRequestException("userId không hợp lệ");

    const set = await this.flashcardSetModel.findById(setId).exec();
    if (!set) throw new NotFoundException(`Không tìm thấy bộ thẻ với ID: ${setId}`);
    if (set.type === FlashcardSetType.LESSON) throw new ForbiddenException("Không thể chỉnh sửa bộ thẻ bài học");
    if (!set.userId || set.userId.toString() !== userId) throw new ForbiddenException("Bạn không có quyền sửa bộ thẻ này");

    const updatedSet = await this.flashcardSetModel
      .findByIdAndUpdate(setId, { $set: updateSetDto }, { new: true })
      .exec();

    return updatedSet;
  }

  /*
  Xóa set — chỉ PERSONAL và owner mới được xóa.
  */
  async deleteSet(setId: string, userId: string): Promise<{ message: string }> {
    if (!Types.ObjectId.isValid(setId)) throw new BadRequestException("setId không hợp lệ");
    if (!Types.ObjectId.isValid(userId)) throw new BadRequestException("userId không hợp lệ");

    const set = await this.flashcardSetModel.findById(setId).exec();
    if (!set) throw new NotFoundException(`Không tìm thấy bộ thẻ với ID: ${setId}`);
    if (set.type === FlashcardSetType.LESSON) throw new ForbiddenException("Không thể xóa bộ thẻ bài học");
    if (!set.userId || set.userId.toString() !== userId) throw new ForbiddenException("Bạn không có quyền xóa bộ thẻ này");

    await this.flashcardSetModel.findByIdAndDelete(setId).exec();
    await this.flashcardModel.deleteMany({ setId: new Types.ObjectId(setId) }).exec();

    return { message: "Đã xóa bộ thẻ và tất cả thẻ bên trong thành công" };
  }

  // ─── Cards ───────────────────────────────────────────────────────────────────

  /*
  Thêm card — chỉ PERSONAL và owner mới được thêm.
  */
  async addCard(setId: string, userId: string, createCardDto: CreateFlashcardDto): Promise<Flashcard> {
    if (!Types.ObjectId.isValid(setId)) throw new BadRequestException("setId không hợp lệ");
    if (!Types.ObjectId.isValid(userId)) throw new BadRequestException("userId không hợp lệ");

    const set = await this.flashcardSetModel.findById(setId).exec();
    if (!set) throw new NotFoundException(`Không tìm thấy bộ thẻ với ID: ${setId}`);
    if (set.type === FlashcardSetType.LESSON) throw new ForbiddenException("Không thể thêm thẻ vào bộ thẻ bài học");
    if (!set.userId || set.userId.toString() !== userId) throw new ForbiddenException("Bạn không có quyền thêm thẻ vào bộ thẻ này");

    const newCard = new this.flashcardModel({
      setId:        new Types.ObjectId(setId),
      frontContent: createCardDto.frontContent,
      backContent:  createCardDto.backContent,
      reviewCount:  0,
    });

    return newCard.save();
  }

  /*
  Cập nhật card — chỉ PERSONAL và owner mới được sửa.
  */
  async updateCard(cardId: string, userId: string, updateCardDto: UpdateFlashcardDto): Promise<Flashcard> {
    if (!Types.ObjectId.isValid(cardId)) throw new BadRequestException("cardId không hợp lệ");
    if (!Types.ObjectId.isValid(userId)) throw new BadRequestException("userId không hợp lệ");

    const card = await this.flashcardModel.findById(cardId).exec();
    if (!card) throw new NotFoundException(`Không tìm thấy thẻ với ID: ${cardId}`);

    const set = await this.flashcardSetModel.findById(card.setId).exec();
    if (!set) throw new NotFoundException("Không tìm thấy bộ thẻ");
    if (set.type === FlashcardSetType.LESSON) throw new ForbiddenException("Không thể chỉnh sửa thẻ trong bộ thẻ bài học");
    if (!set.userId || set.userId.toString() !== userId) throw new ForbiddenException("Bạn không có quyền chỉnh sửa thẻ này");

    return this.flashcardModel.findByIdAndUpdate(cardId, { $set: updateCardDto }, { new: true }).exec();
  }

  /*
  Xóa card — chỉ PERSONAL và owner mới được xóa.
  */
  async deleteCard(cardId: string, userId: string): Promise<{ message: string }> {
    if (!Types.ObjectId.isValid(cardId)) throw new BadRequestException("cardId không hợp lệ");
    if (!Types.ObjectId.isValid(userId)) throw new BadRequestException("userId không hợp lệ");

    const card = await this.flashcardModel.findById(cardId).exec();
    if (!card) throw new NotFoundException(`Không tìm thấy thẻ với ID: ${cardId}`);

    const set = await this.flashcardSetModel.findById(card.setId).exec();
    if (!set) throw new NotFoundException("Không tìm thấy bộ thẻ");
    if (set.type === FlashcardSetType.LESSON) throw new ForbiddenException("Không thể xóa thẻ trong bộ thẻ bài học");
    if (!set.userId || set.userId.toString() !== userId) throw new ForbiddenException("Bạn không có quyền xóa thẻ này");

    await this.flashcardModel.findByIdAndDelete(cardId).exec();
    return { message: "Đã xóa thẻ thành công" };
  }

  // ─── Admin overrides (bypass LESSON type check) ─────────────────────────────

  async adminAddCard(setId: string, createCardDto: CreateFlashcardDto): Promise<Flashcard> {
    if (!Types.ObjectId.isValid(setId)) throw new BadRequestException("setId không hợp lệ");
    const set = await this.flashcardSetModel.findById(setId).exec();
    if (!set) throw new NotFoundException(`Không tìm thấy bộ thẻ với ID: ${setId}`);
    const newCard = new this.flashcardModel({
      setId:        new Types.ObjectId(setId),
      frontContent: createCardDto.frontContent,
      backContent:  createCardDto.backContent,
      reviewCount:  0,
    });
    return newCard.save();
  }

  async adminUpdateCard(cardId: string, updateCardDto: UpdateFlashcardDto): Promise<Flashcard> {
    if (!Types.ObjectId.isValid(cardId)) throw new BadRequestException("cardId không hợp lệ");
    const card = await this.flashcardModel.findById(cardId).exec();
    if (!card) throw new NotFoundException(`Không tìm thấy thẻ với ID: ${cardId}`);
    return this.flashcardModel.findByIdAndUpdate(cardId, { $set: updateCardDto }, { new: true }).exec();
  }

  async adminDeleteCard(cardId: string): Promise<{ message: string }> {
    if (!Types.ObjectId.isValid(cardId)) throw new BadRequestException("cardId không hợp lệ");
    const card = await this.flashcardModel.findById(cardId).exec();
    if (!card) throw new NotFoundException(`Không tìm thấy thẻ với ID: ${cardId}`);
    await this.flashcardModel.findByIdAndDelete(cardId).exec();
    return { message: "Đã xóa thẻ thành công" };
  }

  /*
  Admin: lấy set + cards theo lessonId — không kiểm tra published.
  */
  async adminFindSetWithCardsByLesson(
    lessonId: string,
  ): Promise<{ set: FlashcardSet; cards: Flashcard[] } | null> {
    if (!Types.ObjectId.isValid(lessonId)) throw new BadRequestException("lessonId không hợp lệ");

    const set = await this.flashcardSetModel
      .findOne({ type: FlashcardSetType.LESSON, lessonId: new Types.ObjectId(lessonId) })
      .exec();

    if (!set) return null;

    const cards = await this.flashcardModel
      .find({ setId: set._id })
      .sort({ createdAt: 1 })
      .exec();

    return { set, cards };
  }

  /*
  Lấy set + cards theo lessonId — dành cho tab Flashcard trong trang lesson.
  Trả về null nếu chưa có set nào gắn với lesson đó.
  */
  async findSetWithCardsByLesson(
    lessonId: string,
    userId: string,
  ): Promise<{ set: FlashcardSet; cards: Flashcard[] } | null> {
    if (!Types.ObjectId.isValid(lessonId)) throw new BadRequestException("lessonId không hợp lệ");
    if (!Types.ObjectId.isValid(userId))   throw new BadRequestException("userId không hợp lệ");

    const set = await this.flashcardSetModel
      .findOne({ type: FlashcardSetType.LESSON, lessonId: new Types.ObjectId(lessonId) })
      .exec();

    if (!set) return null;

    await this.assertLessonSetAccessible(set as any);

    const cards = await this.flashcardModel
      .find({ setId: set._id })
      .sort({ createdAt: 1 })
      .exec();

    return { set, cards };
  }

  /*
  Ghi nhận lượt ôn tập — cho phép cả 2 loại set.
  PERSONAL: kiểm tra ownership. LESSON: kiểm tra published.
  */
  async updateReviewSchedule(cardId: string, userId: string): Promise<Flashcard> {
    if (!Types.ObjectId.isValid(cardId)) throw new BadRequestException("cardId không hợp lệ");
    if (!Types.ObjectId.isValid(userId)) throw new BadRequestException("userId không hợp lệ");

    const card = await this.flashcardModel.findById(cardId).exec();
    if (!card) throw new NotFoundException(`Không tìm thấy thẻ với ID: ${cardId}`);

    const set = await this.flashcardSetModel.findById(card.setId).exec();
    if (!set) throw new NotFoundException("Không tìm thấy bộ thẻ");

    if (set.type === FlashcardSetType.PERSONAL) {
      if (!set.userId || set.userId.toString() !== userId) {
        throw new ForbiddenException("Bạn không có quyền cập nhật thẻ này");
      }
    } else {
      await this.assertLessonSetAccessible(set as any);
    }

    return this.flashcardModel
      .findByIdAndUpdate(cardId, { $inc: { reviewCount: 1 } }, { new: true })
      .exec();
  }
}
