// DTO body PATCH /users/:id
import { IsString, IsOptional, IsBoolean, IsEnum, MinLength, MaxLength, IsUrl } from "class-validator";
import { Transform } from "class-transformer";
import { UserRole } from "@/common/enums";

export class UpdateUserAdminDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  fullName?: string;

  @IsOptional()
  @IsUrl()
  avatarUrl?: string;

  @IsOptional()
  @IsEnum(UserRole, { message: "Role phải là STUDENT hoặc ADMIN"})
  role?: UserRole;

  @IsOptional()
  @Transform(({ value }) => value === "true" || value === true)
  @IsBoolean({ message: "isActive phải là true hoặc false" })
  isActive?: boolean;
}
