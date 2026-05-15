// Service CRUD Course: lọc theo topic/published, validate id, tạo/cập nhật/xóa.
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

  /*
  Danh sách course (lọc theo topicId/isPublished)
  Input:
    - topicId — id topic (optional)
    - isPublished — true/false (optional)
   */
  async findAll(topicId?: string, isPublished?: boolean): Promise<Course[]> {
    const filter: any= {};

    // Kiểm tra hợp lệ và áp dụng bộ lọc theo topic
    if (topicId) {
      if (!Types.ObjectId.isValid(topicId)) {
        throw new BadRequestException("topicId không hợp lệ");
      }
      filter["topicId._id"] = new Types.ObjectId(topicId);
    }

    // Áp dụng bộ lọc trạng thái xuất bản khi được cung cấp tường minh
    if (isPublished !== undefined) {
      filter.isPublished = isPublished;
    }

    return this.courseModel
              .find(filter)
              .populate("topicId", "name slug")
              .sort({ orderIndex: 1, createdAt: -1 }) // Sắp xếp chính theo thứ tự hiển thị, phụ theo mới nhất
              .exec();
  }

  /*
  Chi tiết course theo id
  Input:
    - id — id course
   */
  async findOne(id: string): Promise<Course> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException("ID không hợp lệ");
    }

    const course = await this.courseModel
                              .findById(id)
                              .populate("topicId", "name slug description")
                              .exec();

    if (!course) {
      throw new NotFoundException(`Không tìm thấy khóa học với ID: ${id}`);
    }

    return course;
  }

  /*
  Tạo course mới (validate topicId tồn tại)
  Input:
    - createCourseDto — body request
   */
  async create(createCourseDto: CreateCourseDto): Promise<Course> {
    // Xác minh topic tồn tại bằng cách truy vấn trực tiếp collection topics
    const topicExists = await this.courseModel.db
                                      .collection("topics")
                                      .findOne({_id: new Types.ObjectId(createCourseDto.topicId)});

    if (!topicExists) {
      throw new BadRequestException("Topic không tồn tại");
    }

    const newCourse = new this.courseModel(createCourseDto);
    return newCourse.save();
  }

  /*
  Cập nhật course (validate courseId và topicId nếu đổi)
  Input:
    - id — id course
    - updateCourseDto — body request
   */
  async update(id: string, updateCourseDto: UpdateCourseDto): Promise<Course> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException("courseId không hợp lệ");
    }

    // Xác minh topicId mới tham chiếu đến topic thực tế trước khi áp dụng cập nhật
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

  /*
  Xóa course vĩnh viễn
  Input:
    - id — id course
   */
  async remove(id: string): Promise<{ message: string }> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException("courseId không hợp lệ");
    }

    const result = await this.courseModel.findByIdAndDelete(id).exec();

    if (!result) {
      throw new NotFoundException(`Không tìm thấy khóa học với ID: ${id}`);
    }

    return { message: "Xóa khóa học thành công" };
  }
}
