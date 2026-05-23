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
  async findAll(topicId?: string, isPublished?: boolean, isAdmin = false): Promise<Course[]> {
    const filter: any = {};

    // Student luôn chỉ thấy course đã xuất bản
    if (!isAdmin) {
      filter.isPublished = true;
    } else if (isPublished !== undefined) {
      // Admin có thể filter thêm theo isPublished nếu muốn
      filter.isPublished = isPublished;
    }

    if (topicId) {
      if (!Types.ObjectId.isValid(topicId)) {
        throw new BadRequestException("topicId không hợp lệ");
      }
      filter["topicId._id"] = new Types.ObjectId(topicId);
    }

    return this.courseModel
              .find(filter)
              .populate("topicId", "name slug")
              .sort({ createdAt: -1 })
              .exec();
  }

  /*
  Chi tiết course theo id
  Input:
    - id — id course
   */
  async findOne(id: string, isAdmin = false): Promise<Course> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException("ID không hợp lệ");
    }

    const query: any = { _id: new Types.ObjectId(id) };
    if (!isAdmin) query.isPublished = true;

    const course = await this.courseModel
                              .findOne(query)
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
    const topic = await this.courseModel.db
      .collection("topics")
      .findOne({ _id: new Types.ObjectId(createCourseDto.topicId) });

    if (!topic) {
      throw new BadRequestException("Topic không tồn tại");
    }

    const { topicId, ...rest } = createCourseDto;
    const newCourse = new this.courseModel({
      ...rest,
      topicId: { _id: topic._id, name: topic.name, slug: topic.slug },
    });
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

    const { topicId, ...restDto } = updateCourseDto as any;
    const updateData: any = { ...restDto };

    if (topicId) {
      const topic = await this.courseModel.db
        .collection("topics")
        .findOne({ _id: new Types.ObjectId(topicId) });

      if (!topic) {
        throw new BadRequestException("Topic không tồn tại");
      }

      updateData.topicId = { _id: topic._id, name: topic.name, slug: topic.slug };
    }

    const updatedCourse = await this.courseModel
                                    .findByIdAndUpdate(id, updateData, { new: true })
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
