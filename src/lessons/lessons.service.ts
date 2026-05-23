// Service CRUD Lesson + embed video/vocab/grammar
import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { Lesson, LessonDocument } from "../schemas/lesson.schema";
import { Course, CourseDocument } from "../schemas/course.schema";
import { CreateLessonDto } from "./dto/create-lesson.dto";
import { UpdateLessonDto } from "./dto/update-lesson.dto";
import { AddVideoDto } from "./dto/add-video.dto";
import { UpdateVideoDto } from "./dto/update-video.dto";
import { AddVocabularyDto } from "./dto/add-vocabulary.dto";
import { UpdateVocabularyDto } from "./dto/update-vocabulary.dto";
import { AddGrammarDto } from "./dto/add-grammar.dto";
import { UpdateGrammarDto } from "./dto/update-grammar.dto";
import { TargetBand } from "@/common/enums";

@Injectable()
export class LessonsService {
  constructor(
    @InjectModel(Lesson.name) private lessonModel: Model<LessonDocument>,
    @InjectModel(Course.name) private courseModel: Model<CourseDocument>,
  ) {}

  /*
  Danh sách lesson theo courseId (public, chỉ lấy isPublished=true)
  Input:
    - courseId — id course
    - targetBand — filter band (optional)
   */
  async findByCourse(courseId: string, targetBand?: TargetBand, showAll = false): Promise<Lesson[]> {
    if (!Types.ObjectId.isValid(courseId)) {
      throw new BadRequestException("courseId không hợp lệ");
    }

    const filter: any = { courseId: new Types.ObjectId(courseId) };

    if (!showAll) {
      filter.isPublished = true;
    }

    if (targetBand) {
      filter.targetBand = targetBand;
    }

    return this.lessonModel
              .find(filter)
              .populate("courseId", "title")
              .sort({ createdAt: -1 })
              .exec();
  }

  /*
  Chi tiết lesson theo id
  Input:
    - id — id lesson
   */
  async findOne(id: string, isAdmin = false): Promise<Lesson> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException("ID không hợp lệ");
    }

    const query: any = { _id: new Types.ObjectId(id) };
    if (!isAdmin) query.isPublished = true;

    const lesson = await this.lessonModel
                              .findOne(query)
                              .populate("courseId", "title description")
                              .exec();

    if (!lesson) {
      throw new NotFoundException(`Không tìm thấy bài học với ID: ${id}`);
    }

    return lesson;
  }

  /*
  Tạo lesson mới và tăng totalLessons của course
  Input:
    - createLessonDto — body request
   */
  async create(createLessonDto: CreateLessonDto): Promise<Lesson> {
    // Chỉ cho tạo lesson khi course còn active
    const course = await this.courseModel.findOne({
      _id: new Types.ObjectId(createLessonDto.courseId),
      isActive: true,
    });

    if (!course) {
      throw new BadRequestException("Khóa học không tồn tại hoặc đã bị xóa");
    }

    const newLesson = new this.lessonModel(createLessonDto);
    const savedLesson = await newLesson.save();

    const count = await this.lessonModel.countDocuments({ courseId: new Types.ObjectId(createLessonDto.courseId) });
    await this.courseModel.findByIdAndUpdate(createLessonDto.courseId, { totalLessons: count });

    return savedLesson;
  }

  /*
  Cập nhật lesson (validate lessonId và courseId nếu đổi)
  Input:
    - id — id lesson
    - updateLessonDto — body request
   */
  async update(id: string, updateLessonDto: UpdateLessonDto): Promise<Lesson> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException("lessonId không hợp lệ");
    }

    // Nếu đổi courseId thì validate course mới còn active
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

    const updatedLesson = await this.lessonModel
                                    .findByIdAndUpdate(id, updateLessonDto, { new: true })
                                    .populate("courseId", "title")
                                    .exec();

    if (!updatedLesson) {
      throw new NotFoundException(`Không tìm thấy bài học với ID: ${id}`);
    }

    return updatedLesson;
  }

  /*
  Xóa lesson vĩnh viễn và giảm totalLessons của course
  Input:
    - id — id lesson
   */
  async remove(id: string): Promise<{ message: string }> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException("ID không hợp lệ");
    }

    const lesson = await this.lessonModel.findById(id);

    if (!lesson) {
      throw new NotFoundException(`Không tìm thấy bài học với ID: ${id}`);
    }

    await this.lessonModel.findByIdAndDelete(id);

    const count = await this.lessonModel.countDocuments({ courseId: lesson.courseId });
    await this.courseModel.findByIdAndUpdate(lesson.courseId, { totalLessons: count });

    return { message: "Xóa bài học thành công" };
  }

  /*
  Thêm video vào lesson
  Input:
    - lessonId — id lesson
    - addVideoDto — body request
   */
  async addVideo(lessonId: string, addVideoDto: AddVideoDto): Promise<Lesson> {
    if (!Types.ObjectId.isValid(lessonId)) {
      throw new BadRequestException("lessonId không hợp lệ");
    }

    const lesson = await this.lessonModel.findById(lessonId);

    if (!lesson) {
      throw new NotFoundException(`Không tìm thấy bài học với ID: ${lessonId}`);
    }

    // Embed video vào document lesson
    lesson.videos.push(addVideoDto);
    await lesson.save();

    return lesson;
  }

  /*
  Thêm vocabulary vào lesson
  Input:
    - lessonId — id lesson
    - addVocabularyDto — body request
   */
  async addVocabulary(lessonId: string, addVocabularyDto: AddVocabularyDto): Promise<Lesson> {
    if (!Types.ObjectId.isValid(lessonId)) {
      throw new BadRequestException("lessonId không hợp lệ");
    }

    const lesson = await this.lessonModel.findById(lessonId);

    if (!lesson) {
      throw new NotFoundException(`Không tìm thấy bài học với ID: ${lessonId}`);
    }

    // Chỉ lưu các field theo schema
    lesson.vocabularies.push({
      word: addVocabularyDto.word,
      pronunciation: addVocabularyDto.pronunciation,
      definition: addVocabularyDto.definition,
      examples: addVocabularyDto.examples ?? [],
      translation: addVocabularyDto.translation,
      timestamp: addVocabularyDto.timestamp,
      contextSentence: addVocabularyDto.contextSentence,
    });
    await lesson.save();

    return lesson;
  }

  /*
  Thêm grammar vào lesson
  Input:
    - lessonId — id lesson
    - addGrammarDto — body request
   */
  async addGrammar(lessonId: string, addGrammarDto: AddGrammarDto): Promise<Lesson> {
    if (!Types.ObjectId.isValid(lessonId)) {
      throw new BadRequestException("lessonId không hợp lệ");
    }

    const lesson = await this.lessonModel.findById(lessonId);

    if (!lesson) {
      throw new NotFoundException(`Không tìm thấy bài học với ID: ${lessonId}`);
    }

    // Chỉ lưu các field theo schema
    lesson.grammars.push({
      title: addGrammarDto.title,
      explanation: addGrammarDto.explanation,
      examples: addGrammarDto.examples ?? [],
      structure: addGrammarDto.structure,
      timestamp: addGrammarDto.timestamp,
      contextSentence: addGrammarDto.contextSentence,
    });
    await lesson.save();

    return lesson;
  }

  /*
  Xóa video theo index
  Input:
    - lessonId — id lesson
    - videoIndex — index video (0-based)
   */
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

    // Xóa 1 phần tử tại videoIndex
    lesson.videos.splice(videoIndex, 1);
    await lesson.save();

    return lesson;
  }

  /*
  Xóa vocabulary theo index
  Input:
    - lessonId — id lesson
    - vocabIndex — index vocabulary (0-based)
   */
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

    // Xóa 1 phần tử tại vocabIndex
    lesson.vocabularies.splice(vocabIndex, 1);
    await lesson.save();

    return lesson;
  }

  /*
  Xóa grammar theo index
  Input:
    - lessonId — id lesson
    - grammarIndex — index grammar (0-based)
   */
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

    // Xóa 1 phần tử tại grammarIndex
    lesson.grammars.splice(grammarIndex, 1);
    await lesson.save();

    return lesson;
  }

  /*
  Cập nhật video theo index
  Input:
    - lessonId — id lesson
    - videoIndex — index video (0-based)
    - dto — các field cần cập nhật
   */
  async updateVideo(lessonId: string, videoIndex: number, dto: UpdateVideoDto): Promise<Lesson> {
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

    Object.assign(lesson.videos[videoIndex], dto);
    await lesson.save();

    return lesson;
  }

  /*
  Cập nhật vocabulary theo index
  Input:
    - lessonId — id lesson
    - vocabIndex — index vocabulary (0-based)
    - dto — các field cần cập nhật
   */
  async updateVocabulary(lessonId: string, vocabIndex: number, dto: UpdateVocabularyDto): Promise<Lesson> {
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

    Object.assign(lesson.vocabularies[vocabIndex], dto);
    await lesson.save();

    return lesson;
  }

  /*
  Cập nhật grammar theo index
  Input:
    - lessonId — id lesson
    - grammarIndex — index grammar (0-based)
    - dto — các field cần cập nhật
   */
  async updateGrammar(lessonId: string, grammarIndex: number, dto: UpdateGrammarDto): Promise<Lesson> {
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

    Object.assign(lesson.grammars[grammarIndex], dto);
    await lesson.save();

    return lesson;
  }
}
