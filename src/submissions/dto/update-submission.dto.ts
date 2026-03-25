import { IsString, IsOptional, IsNumber, Min, MinLength } from "class-validator";

// DTO để cập nhật một submission (chỉ cho phép cập nhật essayContent và timeSpentSeconds)
export class UpdateSubmissionDto {
  @IsString({ message: "essayContent phải là chuỗi" })
  @IsOptional()
  @MinLength(50, { message: "Bài viết phải có ít nhất 50 ký tự" })
  essayContent?: string;

  @IsNumber({}, { message: "timeSpentSeconds phải là số" })
  @IsOptional()
  @Min(0, { message: "timeSpentSeconds phải >= 0" })
  timeSpentSeconds?: number;
}
