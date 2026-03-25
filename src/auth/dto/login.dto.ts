import {IsEmail, IsNotEmpty, IsString} from "class-validator";

/** DTO cho POST /api/auth/login */
export class LoginDto {
  @IsEmail({}, { message: "Email không hợp lệ" })
  @IsNotEmpty({ message: "Email không được để trống" })
  email: string;

  @IsString()
  @IsNotEmpty({ message: "Mật khẩu không được để trống" })
  password: string;
}
