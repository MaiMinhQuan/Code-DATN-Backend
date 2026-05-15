// REST /exam-questions — CRUD đề, filter, lấy random để luyện tập.
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ExamQuestionsService } from "./exam-questions.service";
import { CreateExamQuestionDto } from "./dto/create-exam-question.dto";
import { UpdateExamQuestionDto } from "./dto/update-exam-question.dto";
import { QueryExamQuestionDto } from "./dto/query-exam-question.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { UserRole } from "../common/enums";

@Controller("exam-questions")
export class ExamQuestionsController {
  constructor(private readonly examQuestionsService: ExamQuestionsService) {}

  /*
  GET /exam-questions — danh sách đề thi (filter)
  Input:
    - query — query params
   */
  @Get()
  async findAll(@Query() query: QueryExamQuestionDto) {
    return this.examQuestionsService.findAll(query);
  }

  /*
  GET /exam-questions/random — đề ngẫu nhiên (cần JWT)
  Input:
    - topicId — query optional
   */
  @UseGuards(JwtAuthGuard)
  @Get("random")
  async getRandomQuestion(@Query("topicId") topicId?: string) {
    return this.examQuestionsService.getRandomQuestion(topicId);
  }

  /*
  GET /exam-questions/:id — chi tiết đề thi
  Input:
    - id — id question trên URL
   */
  @Get(":id")
  async findOne(@Param("id") id: string) {
    return this.examQuestionsService.findOne(id);
  }

  /*
  POST /exam-questions — tạo đề (admin)
  Input:
    - createDto — body request
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post()
  async create(@Body() createDto: CreateExamQuestionDto) {
    return this.examQuestionsService.create(createDto);
  }

  /*
  PATCH /exam-questions/:id — cập nhật đề (admin)
  Input:
    - id — id question trên URL
    - updateDto — body request
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Patch(":id")
  async update(@Param("id") id: string, @Body() updateDto: UpdateExamQuestionDto) {
    return this.examQuestionsService.update(id, updateDto);
  }

  /*
  DELETE /exam-questions/:id — xóa đề (admin)
  Input:
    - id — id question trên URL
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Delete(":id")
  async delete(@Param("id") id: string) {
    return this.examQuestionsService.delete(id);
  }
}
