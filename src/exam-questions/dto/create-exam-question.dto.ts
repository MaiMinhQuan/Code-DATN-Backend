import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsMongoId,
  IsInt,
  Min,
  Max,
  IsBoolean,
  IsArray,
} from "class-validator";

export class CreateExamQuestionDto {
  @IsString({ message: "Tiêu đề phải là chuỗi" })
  @IsNotEmpty({ message: "Tiêu đề không được để trống" })
  title: string;

  @IsOptional()
  @IsMongoId({ message: "topicId phải là MongoDB ObjectId hợp lệ" })
  topicId?: string;

  @IsString({ message: "Đề bài phải là chuỗi" })
  @IsNotEmpty({ message: "Đề bài không được để trống" })
  questionPrompt: string;

  @IsOptional()
  @IsString({ message: "Gợi ý dàn ý phải là chuỗi" })
  suggestedOutline?: string;

  @IsOptional()
  @IsInt({ message: "Độ khó phải là số nguyên" })
  @Min(1, { message: "Độ khó tối thiểu là 1" })
  @Max(5, { message: "Độ khó tối đa là 5" })
  difficultyLevel?: number;

  @IsOptional()
  @IsBoolean({ message: "isPublished phải là boolean" })
  isPublished?: boolean;

  @IsOptional()
  @IsString({ message: "Nguồn đề thi phải là chuỗi" })
  sourceReference?: string;

  @IsOptional()
  @IsArray({ message: "Tags phải là mảng" })
  @IsString({ each: true, message: "Mỗi tag phải là chuỗi" })
  tags?: string[];
}
