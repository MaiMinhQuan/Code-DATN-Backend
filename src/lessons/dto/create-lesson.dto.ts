import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsMongoId,
  IsEnum,
  MaxLength,
  Min
} from "class-validator";
import { TargetBand } from "@/common/enums";

// DTO cho POST /api/lessons - Tạo mới một lesson
export class CreateLessonDto {
  @IsString({ message: "Tiêu đề phải là chuỗi ký tự" })
  @IsNotEmpty({ message: "Tiêu đề không được để trống" })
  @MaxLength(200, { message: "Tiêu đề không được vượt quá 200 ký tự" })
  title: string;

  @IsMongoId({ message: "courseId phải là MongoDB ObjectId hợp lệ" })
  @IsNotEmpty({ message: "courseId không được để trống" })
  courseId: string;

  @IsEnum(TargetBand, { message: "targetBand phải là BAND_5_0, BAND_6_0, hoặc BAND_7_PLUS" })
  @IsNotEmpty({ message: "targetBand không được để trống" })
  targetBand: TargetBand;

  @IsString({ message: "Mô tả phải là chuỗi ký tự" })
  @IsOptional()
  @MaxLength(2000, { message: "Mô tả không được vượt quá 2000 ký tự" })
  description?: string;

  @IsNumber({}, { message: "orderIndex phải là số" })
  @IsOptional()
  @Min(0, { message: "orderIndex không được nhỏ hơn 0" })
  orderIndex?: number;

  @IsBoolean({ message: "isPublished phải là boolean" })
  @IsOptional()
  isPublished?: boolean;

  @IsString({ message: "notesContent phải là chuỗi ký tự" })
  @IsOptional()
  notesContent?: string;
}
