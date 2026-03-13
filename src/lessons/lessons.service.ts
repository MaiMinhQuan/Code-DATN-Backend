import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { Lesson, LessonDocument } from "../schemas/lesson.schema";
import { Course, CourseDocument } from "../schemas/course.schema";
import { CreateLessonDto } from "./dto/create-lesson.dto";
import { UpdateLessonDto } from "./dto/update-lesson.dto";
import { AddVideoDto } from "./dto/add-video.dto";
import { AddVocabularyDto } from "./dto/add-vocabulary.dto";
import { AddGrammarDto } from "./dto/add-grammar.dto";
import { TargetBand } from "@/common/enums";

@Injectable()
export class LessonsService {
  constructor(
    @InjectModel(Lesson.name) private lessonModel: Model<LessonDocument>,
    @InjectModel(Course.name) private courseModel: Model<CourseDocument>,
  ) {}

  // Lấy danh sách lesson
  async findByCourse(courseId: string, targetBand?: TargetBand): Promise<Lesson[]> {
    if (!Types.ObjectId.isValid(courseId)) {
      throw new BadRequestException("courseId không hợp lệ");
    }

    const filter: any = {
      courseId: new Types.ObjectId(courseId),
      isPublished: true,
    };

    if (targetBand) {
      filter.targetBand = targetBand;
    }

    return this.lessonModel
              .find(filter)
              .populate("courseId", "title")
              .sort({ orderIndex: 1, createdAt: -1 })
              .exec();
  }

  // Lấy chi tiết 1 lesson
  async findOne(id: string): Promise<Lesson> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException("ID không hợp lệ");
    }

    const lesson = await this.lessonModel
                              .findById(id)
                              .populate("courseId", "title description")
                              .exec();

    if (!lesson) {
      throw new NotFoundException(`Không tìm thấy bài học với ID: ${id}`);
    }

    return lesson;
  }

  // Tạo lesson mới (Admin)
  async create(createLessonDto: CreateLessonDto): Promise<Lesson> {
    // Kiểm tra courseId hợp lệ
    const course = await this.courseModel.findOne({
      _id: new Types.ObjectId(createLessonDto.courseId),
      isActive: true,
    });

    if (!course) {
      throw new BadRequestException("Khóa học không tồn tại hoặc đã bị xóa");
    }

    // Tạo lesson mới
    const newLesson = new this.lessonModel(createLessonDto);
    const savedLesson = await newLesson.save();

    // Tăng totalLessons của khóa học
    await this.courseModel.findByIdAndUpdate(
      createLessonDto.courseId,
      { $inc: { totalLessons: 1 } },
    );

    return savedLesson;
  }

  // Cập nhật lesson (Admin)
  async update(id: string, updateLessonDto: UpdateLessonDto): Promise<Lesson> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException("lessonId không hợp lệ");
    }

    // Nếu update courseId, kiểm tra course đó có tồn tại không
    const dto = updateLessonDto as Partial<CreateLessonDto>;
    if (dto.courseId) {
      const course = await this.courseModel.findOne({
        _id: new Types.ObjectId(dto.courseId),
        isActive: true,
      });

      if (!course) {
        throw new BadRequestException("Khóa học không tồn tại hoặc đã bị xóa");
      }
    }

    // Cập nhật lesson
    const updatedLesson = await this.lessonModel
                                    .findByIdAndUpdate(id, updateLessonDto, { new: true })
                                    .populate("courseId", "title")
                                    .exec();

    if (!updatedLesson) {
      throw new NotFoundException(`Không tìm thấy bài học với ID: ${id}`);
    }

    return updatedLesson;
  }

  // Xóa lesson (Admin)
  async remove(id: string): Promise<{ message: string }> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException("ID không hợp lệ");
    }

    const lesson = await this.lessonModel.findById(id);

    if (!lesson) {
      throw new NotFoundException(`Không tìm thấy bài học với ID: ${id}`);
    }

    // Xóa lesson
    await this.lessonModel.findByIdAndDelete(id);

    // Giảm totalLessons của course
    await this.courseModel.findByIdAndUpdate(
      lesson.courseId,
      { $inc: { totalLessons: -1 } },
    );

    return { message: "Xóa bài học thành công" };
  }

  // Thêm video vào lesson (Admin)
  async addVideo(lessonId: string, addVideoDto: AddVideoDto): Promise<Lesson> {
    if (!Types.ObjectId.isValid(lessonId)) {
      throw new BadRequestException("lessonId không hợp lệ");
    }

    const lesson = await this.lessonModel.findById(lessonId);

    if (!lesson) {
      throw new NotFoundException(`Không tìm thấy bài học với ID: ${lessonId}`);
    }

    // Thêm video vào mảng
    lesson.videos.push(addVideoDto);
    await lesson.save();

    return lesson;
  }

  // Thêm vocabulary vào lesson (Admin)
  async addVocabulary(lessonId: string, addVocabularyDto: AddVocabularyDto): Promise<Lesson> {
    if (!Types.ObjectId.isValid(lessonId)) {
      throw new BadRequestException("lessonId không hợp lệ");
    }

    const lesson = await this.lessonModel.findById(lessonId);

    if (!lesson) {
      throw new NotFoundException(`Không tìm thấy bài học với ID: ${lessonId}`);
    }

    // Thêm vocabulary vào mảng
    lesson.vocabularies.push({
      word: addVocabularyDto.word,
      pronunciation: addVocabularyDto.pronunciation,
      definition: addVocabularyDto.definition,
      examples: addVocabularyDto.examples ?? [],
      translation: addVocabularyDto.translation,
    });
    await lesson.save();

    return lesson;
  }

  // Thêm grammar vào lesson (Admin)
  async addGrammar(lessonId: string, addGrammarDto: AddGrammarDto): Promise<Lesson> {
    if (!Types.ObjectId.isValid(lessonId)) {
      throw new BadRequestException("lessonId không hợp lệ");
    }

    const lesson = await this.lessonModel.findById(lessonId);

    if (!lesson) {
      throw new NotFoundException(`Không tìm thấy bài học với ID: ${lessonId}`);
    }

    // Thêm grammar vào mảng
    lesson.grammars.push({
      title: addGrammarDto.title,
      explanation: addGrammarDto.explanation,
      examples: addGrammarDto.examples ?? [],
      structure: addGrammarDto.structure,
    });
    await lesson.save();

    return lesson;
  }

  // Xóa video khỏi lesson (Admin)
  async removeVideo(lessonId: string, videoIndex: number): Promise<Lesson> {
    if (!Types.ObjectId.isValid(lessonId)) {
      throw new BadRequestException("lessonId không hợp lệ");
    }

    const lesson = await this.lessonModel.findById(lessonId);

    if (!lesson) {
      throw new NotFoundException(`Không tìm thấy bài học với ID: ${lessonId}`);
    }

    if (videoIndex < 0 || videoIndex >= lesson.videos.length) {
      throw new BadRequestException("videoIndex không hợp lệ");
    }

    // Xóa video tại index
    lesson.videos.splice(videoIndex, 1);
    await lesson.save();

    return lesson;
  }

  // Xóa vocabulary khỏi lesson (Admin)
  async removeVocabulary(lessonId: string, vocabIndex: number): Promise<Lesson> {
    if (!Types.ObjectId.isValid(lessonId)) {
      throw new BadRequestException("lessonId không hợp lệ");
    }

    const lesson = await this.lessonModel.findById(lessonId);

    if (!lesson) {
      throw new NotFoundException(`Không tìm thấy bài học với ID: ${lessonId}`);
    }

    if (vocabIndex < 0 || vocabIndex >= lesson.vocabularies.length) {
      throw new BadRequestException("vocabIndex không hợp lệ");
    }

    lesson.vocabularies.splice(vocabIndex, 1);
    await lesson.save();

    return lesson;
  }

  // Xóa grammar khỏi lesson (Admin)
  async removeGrammar(lessonId: string, grammarIndex: number): Promise<Lesson> {
    if (!Types.ObjectId.isValid(lessonId)) {
      throw new BadRequestException("lessonId không hợp lệ");
    }

    const lesson = await this.lessonModel.findById(lessonId);

    if (!lesson) {
      throw new NotFoundException(`Không tìm thấy bài học với ID: ${lessonId}`);
    }

    if (grammarIndex < 0 || grammarIndex >= lesson.grammars.length) {
      throw new BadRequestException("grammarIndex không hợp lệ");
    }

    lesson.grammars.splice(grammarIndex, 1);
    await lesson.save();

    return lesson;
  }
}
