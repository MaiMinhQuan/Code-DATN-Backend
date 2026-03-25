import { IsString, IsOptional, IsBoolean, IsUrl, MinLength, MaxLength, IsInt, Min } from "class-validator";

// DTO cho PATCH /api/topics/:id - Cập nhật topic
export class UpdateTopicDto {
  @IsOptional()
  @IsString()
  @MinLength(2, { message: "Tên chủ đề phải có ít nhất 2 ký tự" })
  @MaxLength(100, { message: "Tên chủ đề không được quá 100 ký tự" })
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500, { message: "Mô tả không được quá 500 ký tự" })
  description?: string;

  @IsOptional()
  @IsUrl({}, { message: "URL icon không hợp lệ" })
  iconUrl?: string;

  @IsOptional()
  @IsInt({ message: "orderIndex phải là số nguyên" })
  @Min(0, { message: "orderIndex phải >= 0" })
  orderIndex?: number;

  @IsOptional()
  @IsBoolean({ message: "isActive phải là true hoặc false" })
  isActive?: boolean;
}
