// DTO query GET /exam-questions
import { IsOptional, IsMongoId, IsInt, Min, Max, IsBoolean } from "class-validator";
import { Transform, Type } from "class-transformer";

export class QueryExamQuestionDto {
  @IsOptional()
  @IsMongoId({ message: "topicId phải là MongoDB ObjectId hợp lệ" })
  topicId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: "Độ khó phải là số nguyên" })
  @Min(1, { message: "Độ khó tối thiểu là 1" })
  @Max(3, { message: "Độ khó tối đa là 3" })
  difficultyLevel?: number;

  @IsOptional()
  @Transform(({ value }) => value === "true" || value === true)
  @IsBoolean({ message: "isPublished phải là boolean" })
  isPublished?: boolean;
}
