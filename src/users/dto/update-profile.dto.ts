import { IsString, IsOptional, MinLength, MaxLength, IsUrl } from "class-validator";

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(2, { message: "Tên hiện thị phải có ít nhất 2 ký tự"})
  @MaxLength(100, { message: "Tên hiển thị không được quá 100 ký tự"})
  fullName?: string;

  @IsOptional()
  @IsUrl({}, { message: "URL avatar không hợp lệ"})
  avatarUrl?: string;
}
