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

  // GET /api/courses
  // Query params: topicId, isPublished
  // lấy danh sách các khóa học (public)
  @Get()
  async findAll(
    @Query("topicId") topicId?: string,
    @Query("isPublished") isPublished?: string,
  ) {
    const isPublishedBool = isPublished === "true" ? true : isPublished === "false" ? false : undefined;

    return this.coursesService.findAll(topicId, isPublishedBool);
  }

  // GET /api/courses/:id
  // Lấy chi tiết 1 khóa học (Public)
  @Get(":id")
  async findOne(@Param("id") id: string) {
    return this.coursesService.findOne(id)
  }

  // POST /api/courses
  // Tạo khóa học mới (Admin)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post()
  async create(@Body() createCourseDto: CreateCourseDto) {
    return this.coursesService.create(createCourseDto);
  }

  // PATCH /api/courses/:id
  // Cập nhật course (Admin)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Patch(":id")
  async update(
    @Param("id") id: string,
    @Body() updateCourseDto: UpdateCourseDto,
  ) {
    return this.coursesService.update(id, updateCourseDto);
  }

  // DELETE /api/courses/:id
  // Xóa khóa học (Admin)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Delete(":id")
  async remove(@Param("id") id: string) {
    return this.coursesService.remove(id);
  }
}
