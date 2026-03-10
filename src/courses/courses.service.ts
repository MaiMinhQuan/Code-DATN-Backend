import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { Course, CourseDocument } from "../schemas/course.schema";
import { CreateCourseDto } from "./dto/create-course.dto";
import { UpdateCourseDto } from "./dto/update-course.dto";

@Injectable()
export class CoursesService {
  constructor(
    @InjectModel(Course.name) private courseModel: Model<CourseDocument>,
  ) {}

  // Lấy danh sách các khóa học với filter
  // topicId: lọc theo topic
  // isPublished: lọc theo trạng thái publish
  async findAll(topicId?: string, isPublished?: boolean): Promise<Course[]> {
    const filter: any= {
      isActive: true
    };

    // Filter theo topicId
    if (topicId) {
      if (!Types.ObjectId.isValid(topicId)) {
        throw new BadRequestException("topicId không hợp lệ");
      }
      filter.topicId = new Types.ObjectId(topicId);
    }

    // Filter theo trạng thái publish
    if (isPublished !== undefined) {
      filter.isPublished = isPublished;
    }

    return this.courseModel
              .find(filter)
              .populate("topicId", "name slug")
              .sort({ orderIndex: 1, createdAt: -1 }) // Sắp xếp theo orderIndex, sau đó theo thời gian tạo
              .exec();
  }

  // Lấy chi tiết 1 khóa học theo id
  async findOne(id: string): Promise<Course> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException("ID không hợp lệ");
    }

    const course = await this.courseModel
                              .findOne({ _id: id, isActive: true })
                              .populate("topicId", "name slug description")
                              .exec();

    if (!course) {
      throw new NotFoundException(`Không tìm thấy khóa học với ID: ${id}`);
    }

    return course;
  }

  // Tạo khóa học mới (chỉ cho admin)
  async create(createCourseDto: CreateCourseDto): Promise<Course> {
    const topicExists = await this.courseModel.db
                                      .collection("topics")
                                      .findOne({_id: new Types.ObjectId(createCourseDto.topicId)});

    if (!topicExists) {
      throw new BadRequestException("Topic không tồn tại");
    }

    const newCourse = new this.courseModel(createCourseDto);
    return newCourse.save();
  }

  // Cập nhật khóa học (chỉ cho admin)
  async update(id: string, updateCourseDto: UpdateCourseDto): Promise<Course> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException("courseId không hợp lệ");
    }

    // Nếu update topicId, kiểm tra topic đó có tồn tại không
    const dto = updateCourseDto as Partial<CreateCourseDto>;
    if (dto.topicId) {
      const topicExists = await this.courseModel.db
                                          .collection("topics")
                                          .findOne({_id: new Types.ObjectId(dto.topicId)});

      if (!topicExists) {
        throw new BadRequestException("Topic không tồn tại");
      }
    }

    const updatedCourse = await this.courseModel
                                    .findByIdAndUpdate(id, updateCourseDto, { new: true })
                                    .populate("topicId", "name slug description")
                                    .exec();

    if (!updatedCourse) {
      throw new NotFoundException(`Không tìm thấy khóa học với ID: ${id}`);
    }

    return updatedCourse;
  }

  // Xóa khóa học (chỉ cho admin)
  async remove(id: string): Promise<{ message: string }> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('courseId không hợp lệ');
    }

    // Soft delete: Set isActive = false
    const result = await this.courseModel
                            .findByIdAndUpdate(
                              id,
                              { isActive: false },
                              { new: true }
                            )
                            .exec();

    if (!result) {
      throw new NotFoundException(`Không tìm thấy khóa học với ID: ${id}`);
    }

    return { message: 'Xóa khóa học thành công' };
  }
}
