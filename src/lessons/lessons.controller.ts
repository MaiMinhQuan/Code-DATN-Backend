// REST /lessons — đọc public; CRUD + embed video/vocab/grammar chỉ admin.
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

  /*
  GET /lessons?courseId=...&targetBand=... — danh sách lesson theo courseId
  Input:
    - courseId — query bắt buộc
    - targetBand — query optional
   */
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

  /*
  GET /lessons/:id — chi tiết lesson
  Input:
    - id — id lesson trên URL
   */
  @Get(":id")
  async findOne(@Param("id") id: string) {
    return this.lessonsService.findOne(id);
  }

  /*
  POST /lessons — tạo lesson (admin)
  Input:
    - createLessonDto — body request
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post()
  async create(@Body() createLessonDto: CreateLessonDto) {
    return this.lessonsService.create(createLessonDto);
  }

  /*
  PATCH /lessons/:id — cập nhật lesson (admin)
  Input:
    - id — id lesson trên URL
    - updateLessonDto — body request
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Patch(":id")
  async update(
    @Param("id") id: string,
    @Body() updateLessonDto: UpdateLessonDto,
  ) {
    return this.lessonsService.update(id, updateLessonDto);
  }

  /*
  DELETE /lessons/:id — xóa lesson (admin)
  Input:
    - id — id lesson trên URL
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Delete(":id")
  async remove(@Param("id") id: string) {
    return this.lessonsService.remove(id);
  }

  /*
  POST /lessons/:id/videos — thêm video (admin)
  Input:
    - id — id lesson trên URL
    - addVideoDto — body request
   */
  @Post(":id/videos")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async addVideo(
    @Param("id") id: string,
    @Body() addVideoDto: AddVideoDto,
  ) {
    return this.lessonsService.addVideo(id, addVideoDto);
  }

  /*
  DELETE /lessons/:id/videos/:index — xóa video theo index (admin)
  Input:
    - id — id lesson trên URL
    - index — index video (0-based)
   */
  @Delete(":id/videos/:index")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async removeVideo(
    @Param("id") id: string,
    @Param("index", ParseIntPipe) index: number,
  ) {
    return this.lessonsService.removeVideo(id, index);
  }

  /*
  POST /lessons/:id/vocabularies — thêm vocabulary (admin)
  Input:
    - id — id lesson trên URL
    - addVocabularyDto — body request
   */
  @Post(":id/vocabularies")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async addVocabulary(
    @Param("id") id: string,
    @Body() addVocabularyDto: AddVocabularyDto,
  ) {
    return this.lessonsService.addVocabulary(id, addVocabularyDto);
  }

  /*
  DELETE /lessons/:id/vocabularies/:index — xóa vocabulary theo index (admin)
  Input:
    - id — id lesson trên URL
    - index — index vocabulary (0-based)
   */
  @Delete(":id/vocabularies/:index")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async removeVocabulary(
    @Param("id") id: string,
    @Param("index", ParseIntPipe) index: number,
  ) {
    return this.lessonsService.removeVocabulary(id, index);
  }

  /*
  POST /lessons/:id/grammars — thêm grammar (admin)
  Input:
    - id — id lesson trên URL
    - addGrammarDto — body request
   */
  @Post(":id/grammars")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async addGrammar(
    @Param("id") id: string,
    @Body() addGrammarDto: AddGrammarDto,
  ) {
    return this.lessonsService.addGrammar(id, addGrammarDto);
  }

  /*
  DELETE /lessons/:id/grammars/:index — xóa grammar theo index (admin)
  Input:
    - id — id lesson trên URL
    - index — index grammar (0-based)
   */
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
