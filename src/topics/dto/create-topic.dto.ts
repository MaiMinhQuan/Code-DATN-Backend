// DTO body POST /topics
import { IsString, IsNotEmpty, IsOptional, MinLength, MaxLength, IsBoolean } from "class-validator";
import { Transform } from "class-transformer";

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
  @Transform(({ value }) => value === "true" || value === true)
  @IsBoolean()
  isActive?: boolean;
}
