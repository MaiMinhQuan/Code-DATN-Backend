// DTO query GET /submissions
import { IsEnum, IsOptional, IsMongoId, IsNumber, Min, Max } from "class-validator";
import { Type } from "class-transformer";
import { SubmissionStatus } from "@/common/enums";

export class QuerySubmissionDto {
  @IsMongoId({ message: "questionId phải là MongoDB ObjectId hợp lệ" })
  @IsOptional()
  questionId?: string;

  @IsEnum(SubmissionStatus, { message: "status không hợp lệ" })
  @IsOptional()
  status?: SubmissionStatus;

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  @Min(1)
  page?: number = 1;

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(100)
  limit?: number = 10;
}
