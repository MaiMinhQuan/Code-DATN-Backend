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
  GET /courses — danh sách khóa học (public, chỉ isPublished=true)
  Input:
    - topicId — query optional
   */
  @Get()
  async findAll(
    @Query("topicId") topicId?: string,
  ) {
    return this.coursesService.findAll(topicId, undefined, false);
  }

  /*
  GET /courses/admin — danh sách khóa học dành cho admin (kể cả nháp)
  Input:
    - topicId — query optional
    - isPublished — query optional ("true"/"false")
   */
  @Get("admin")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async findAllAdmin(
    @Query("topicId") topicId?: string,
    @Query("isPublished") isPublished?: string,
  ) {
    const isPublishedBool = isPublished === "true" ? true : isPublished === "false" ? false : undefined;
    return this.coursesService.findAll(topicId, isPublishedBool, true);
  }

  /*
  GET /courses/:id — chi tiết khóa học (public, chỉ trả về nếu isPublished=true)
  Input:
    - id — id course trên URL
   */
  @Get(":id")
  async findOne(@Param("id") id: string) {
    return this.coursesService.findOne(id, false);
  }

  /*
  GET /courses/admin/:id — chi tiết khóa học dành cho admin (kể cả nháp)
  Input:
    - id — id course trên URL
   */
  @Get("admin/:id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async findOneAdmin(@Param("id") id: string) {
    return this.coursesService.findOne(id, true);
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
