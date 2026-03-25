import {IsEmail, IsNotEmpty, IsString, MinLength, MaxLength, Min} from "class-validator";

/** DTO cho POST /api/auth/register */
export class RegisterDto {
  @IsEmail({}, { message:"Email không hợp lệ" })
  @IsNotEmpty({ message: "Email không được để trống " })
  email: string;

  @IsString()
  @IsNotEmpty({ message: "Mật khẩu không được để trống" })
  @MinLength(6, { message: "Mật khẩu phải có ít nhất 6 ký tự" })
  @MaxLength(50, { message: "Mật khẩu không được quá 50 ký tự" })
  password: string;

  @IsString()
  @IsNotEmpty({ message: "Tên hiển thị không được để trống" })
  @MinLength(2, { message: "Tên hiển thị phải có ít nhất 2 ký tự" })
  @MaxLength(30, { message: "Tên hiển thị không được quá 30 ký tự" })
  fullName: string;
}
