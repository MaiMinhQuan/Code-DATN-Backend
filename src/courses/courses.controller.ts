// REST /courses — đọc công khai; tạo/sửa/xóa chỉ admin.
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from "@nestjs/common";
import { CoursesService } from "./courses.service";
import { CreateCourseDto } from "./dto/create-course.dto";
import { UpdateCourseDto } from "./dto/update-course.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { UserRole } from "../common/enums";

@Controller("courses")
export class CoursesController {
  constructor (private readonly coursesService: CoursesService) {}

  /*
  GET /courses — danh sách khóa học
  Input:
    - topicId — query optional
    - isPublished — query optional ("true"/"false")
   */
  @Get()
  async findAll(
    @Query("topicId") topicId?: string,
    @Query("isPublished") isPublished?: string,
  ) {
    // Chuyển đổi query string sang boolean trước khi truyền vào service
    const isPublishedBool = isPublished === "true" ? true : isPublished === "false" ? false : undefined;

    return this.coursesService.findAll(topicId, isPublishedBool);
  }

  /*
  GET /courses/:id — chi tiết khóa học
  Input:
    - id — id course trên URL
   */
  @Get(":id")
  async findOne(@Param("id") id: string) {
    return this.coursesService.findOne(id)
  }

  /*
  POST /courses — tạo khóa học (admin)
  Input:
    - createCourseDto — body request
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post()
  async create(@Body() createCourseDto: CreateCourseDto) {
    return this.coursesService.create(createCourseDto);
  }

  /*
  PATCH /courses/:id — cập nhật khóa học (admin)
  Input:
    - id — id course trên URL
    - updateCourseDto — body request
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Patch(":id")
  async update(
    @Param("id") id: string,
    @Body() updateCourseDto: UpdateCourseDto,
  ) {
    return this.coursesService.update(id, updateCourseDto);
  }

  /*
  DELETE /courses/:id — xóa khóa học (admin)
  Input:
    - id — id course trên URL
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Delete(":id")
  async remove(@Param("id") id: string) {
    return this.coursesService.remove(id);
  }
}
