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

  // GET /api/exam-questions
  // Lấy danh sách đề thi
  @Get()
  async findAll(@Query() query: QueryExamQuestionDto) {
    return this.examQuestionsService.findAll(query);
  }

  // GET /api/exam-questions/random
  // Random 1 đề cho học viên luyện tập
  @UseGuards(JwtAuthGuard)
  @Get("random")
  async getRandomQuestion(@Query("topicId") topicId?: string) {
    return this.examQuestionsService.getRandomQuestion(topicId);
  }

  // GET /api/exam-questions/:id
  // Lấy chi tiết đề thi
  @Get(":id")
  async findOne(@Param("id") id: string) {
    return this.examQuestionsService.findOne(id);
  }

  // POST /api/exam-questions
  // Tạo đề thi mới (Admin)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post()
  async create(@Body() createDto: CreateExamQuestionDto) {
    return this.examQuestionsService.create(createDto);
  }

  // PATCH /api/exam-questions/:id
  // Cập nhật đề thi (Admin)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Patch(":id")
  async update(@Param("id") id: string, @Body() updateDto: UpdateExamQuestionDto) {
    return this.examQuestionsService.update(id, updateDto);
  }

  // DELETE /api/exam-questions/:id
  // Xóa đề thi (Admin)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Delete(":id")
  async delete(@Param("id") id: string) {
    return this.examQuestionsService.delete(id);
  }
}
