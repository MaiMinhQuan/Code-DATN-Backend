import {
  IsString,
  IsNotEmpty,
  IsEnum,
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
import { TargetBand } from "../../common/enums";
import { HighlightAnnotationDto } from "./highlight-annotation.dto";

// DTO cho POST /api/sample-essays - Tạo mới một sample essay
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

  @IsEnum(TargetBand, { message: "targetBand phải là BAND_5_0, BAND_6_0, hoặc BAND_7_PLUS" })
  targetBand: TargetBand;

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

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(9)
  overallBandScore?: number;   // 0-9, ví dụ: 7.5
}
