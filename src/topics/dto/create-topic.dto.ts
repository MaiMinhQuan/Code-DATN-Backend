// DTO body POST /topics
import { IsString, IsNotEmpty, IsOptional, IsUrl, MinLength, MaxLength, IsInt, Min } from "class-validator";

export class CreateTopicDto {
  @IsString()
  @IsNotEmpty({ message: "Tên chủ đề không được để trống" })
  @MinLength(2, { message: "Tên chủ đề phải có ít nhất 2 ký tự" })
  @MaxLength(100, { message: "Tên chủ đề không được quá 100 ký tự" })
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(500, { message: "Mô tả không được quá 500 ký tự"})
  description?: string;

  @IsOptional()
  @IsUrl({}, { message: "URL icon không hợp lệ" })
  iconUrl?: string;

  @IsOptional()
  @IsInt({ message: "orderIndex phải là số nguyên"})
  @Min(0, { message: "orderIndex phải >= 0" })
  orderIndex?: number;
}
