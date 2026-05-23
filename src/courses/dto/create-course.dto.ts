// DTO body POST /courses
import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsMongoId, MaxLength } from "class-validator";

export class CreateCourseDto {
  @IsString({ message: "Tiêu đề phải là chuỗi ký tự" })
  @IsNotEmpty({ message: "Tiêu đề không được để trống" })
  @MaxLength(200, { message: "Tiêu đề không được vượt quá 200 ký tự" })
  title: string;

  @IsString({ message: "Mô tả phải là chuỗi ký tự" })
  @IsOptional()
  @MaxLength(2000, { message: "Mô tả không được vượt quá 2000 ký tự" })
  description?: string;

  @IsMongoId({ message: "topicId phải là MongoDB ObjectId hợp lệ" })
  @IsNotEmpty({ message: "topicId không được để trống" })
  topicId: string;

  @IsBoolean({ message: "isPublished phải là boolean" })
  @IsOptional()
  isPublished?: boolean;
}
