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
  ParseIntPipe,
  BadRequestException,
} from "@nestjs/common";
import { LessonsService } from "./lessons.service";
import { CreateLessonDto } from "./dto/create-lesson.dto";
import { UpdateLessonDto } from "./dto/update-lesson.dto";
import { AddVideoDto } from "./dto/add-video.dto";
import { AddVocabularyDto } from "./dto/add-vocabulary.dto";
import { AddGrammarDto } from "./dto/add-grammar.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { UserRole, TargetBand } from "../common/enums";

@Controller("lessons")
export class LessonsController {
  constructor(private readonly lessonsService: LessonsService) {}

  // GET /api/lessons?courseId=xxx&targetBand=xxx
  // Lấy danh sách lesson theo courseId và targetBand (nếu có)
  @Get()
  async findByCourse(
    @Query("courseId") courseId: string,
    @Query("targetBand") targetBand?: TargetBand,
  ) {
    if (!courseId) {
      throw new BadRequestException("courseId là bắt buộc");
    }

    return this.lessonsService.findByCourse(courseId, targetBand);
  }

  // GET /api/lessons/:id
  // Lấy chi tiết 1 lesson
  @Get(":id")
  async findOne(@Param("id") id: string) {
    return this.lessonsService.findOne(id);
  }

  // POST /api/lessons
  // Tạo lesson mới (admin)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post()
  async create(@Body() createLessonDto: CreateLessonDto) {
    return this.lessonsService.create(createLessonDto);
  }

  // PATCH /api/lessons/:id
  // Cập nhật lesson (admin)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Patch(":id")
  async update(
    @Param("id") id: string,
    @Body() updateLessonDto: UpdateLessonDto,
  ) {
    return this.lessonsService.update(id, updateLessonDto);
  }

  // DELETE /api/lessons/:id
  // Xoá lesson (Admin)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Delete(":id")
  async remove(@Param("id") id: string) {
    return this.lessonsService.remove(id);
  }

  // POST /api/lessons/:id/videos
  // Thêm video vào lesson (Admin)
  @Post(":id/videos")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async addVideo(
    @Param("id") id: string,
    @Body() addVideoDto: AddVideoDto,
  ) {
    return this.lessonsService.addVideo(id, addVideoDto);
  }

  // DELETE /api/lessons/:id/videos/:index
  // Xoá video khỏi lesson (Admin)
  @Delete(":id/videos/:index")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async removeVideo(
    @Param("id") id: string,
    @Param("index", ParseIntPipe) index: number,
  ) {
    return this.lessonsService.removeVideo(id, index);
  }

  // POST /api/lessons/:id/vocabularies
  // Thêm từ vựng vào lesson (Admin)
  @Post(":id/vocabularies")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async addVocabulary(
    @Param("id") id: string,
    @Body() addVocabularyDto: AddVocabularyDto,
  ) {
    return this.lessonsService.addVocabulary(id, addVocabularyDto);
  }

  // DELETE /api/lessons/:id/vocabularies/:index
  // Xoá từ vựng khỏi lesson (Admin)
  @Delete(":id/vocabularies/:index")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async removeVocabulary(
    @Param("id") id: string,
    @Param("index", ParseIntPipe) index: number,
  ) {
    return this.lessonsService.removeVocabulary(id, index);
  }

  // POST /api/lessons/:id/grammars
  // Thêm ngữ pháp vào lesson (Admin)
  @Post(":id/grammars")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async addGrammar(
    @Param("id") id: string,
    @Body() addGrammarDto: AddGrammarDto,
  ) {
    return this.lessonsService.addGrammar(id, addGrammarDto);
  }

  // DELETE /api/lessons/:id/grammars/:index
  // Xoá ngữ pháp khỏi lesson (Admin)
  @Delete(":id/grammars/:index")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async removeGrammar(
    @Param("id") id: string,
    @Param("index", ParseIntPipe) index: number,
  ) {
    return this.lessonsService.removeGrammar(id, index);
  }
}
