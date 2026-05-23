// DTO body PATCH /topics/:id
import { IsString, IsOptional, IsBoolean, MinLength, MaxLength } from "class-validator";
import { Transform } from "class-transformer";

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
  @Transform(({ value }) => value === "true" || value === true)
  @IsBoolean({ message: "isActive phải là true hoặc false" })
  isActive?: boolean;
}
