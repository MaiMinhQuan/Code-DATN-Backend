import { PartialType } from "@nestjs/mapped-types";
import { CreateLessonDto } from "./create-lesson.dto";

// DTO cho PATCH /api/lessons/:id - Cập nhật thông tin lesson
export class UpdateLessonDto extends PartialType(CreateLessonDto) {}
