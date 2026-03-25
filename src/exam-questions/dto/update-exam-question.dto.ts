import { PartialType } from "@nestjs/mapped-types";
import { CreateExamQuestionDto } from "./create-exam-question.dto";

// DTO cho PATCH /api/exam-questions/:id - Cập nhật thông tin đề thi
export class UpdateExamQuestionDto extends PartialType(CreateExamQuestionDto) {}
