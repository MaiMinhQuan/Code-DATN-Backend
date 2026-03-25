import { PartialType } from "@nestjs/mapped-types";
import { CreateCourseDto } from "./create-course.dto";

// DTO cho PATCH /api/courses/:id - Cập nhật khóa học
export class UpdateCourseDto extends PartialType(CreateCourseDto) {}
