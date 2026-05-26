// DTO body POST /sample-essays
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsMongoId,
  IsBoolean,
  IsArray,
  ValidateNested,
  Min,
  Max,
  MaxLength,
} from "class-validator";
import { Type } from "class-transformer";
import { HighlightAnnotationDto } from "./highlight-annotation.dto";

export class CreateSampleEssayDto {
  @IsString()
  @IsNotEmpty({ message: "Tiêu đề không được để trống" })
  @MaxLength(200)
  title: string;

  @IsMongoId({ message: "topicId phải là MongoDB ObjectId hợp lệ" })
  @IsNotEmpty()
  topicId: string;

  @IsString()
  @IsNotEmpty({ message: "Đề bài không được để trống" })
  questionPrompt: string;

  @IsString()
  @IsNotEmpty({ message: "Dàn ý không được để trống" })
  outlineContent: string;

  @IsString()
  @IsNotEmpty({ message: "Nội dung bài viết không được để trống" })
  fullEssayContent: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => HighlightAnnotationDto)
  highlightAnnotations?: HighlightAnnotationDto[];

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  authorName?: string;

  @IsNumber()
  @Min(0)
  @Max(9)
  overallBandScore: number;
}
