// REST /auth — đăng ký và đăng nhập (public).
import {Controller, Post, Body, HttpCode, HttpStatus} from "@nestjs/common";
import { AuthService } from "./auth.service";
import { LoginDto } from "./dto/login.dto";
import { RegisterDto } from "./dto/register.dto";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /*
  POST /auth/register — đăng ký tài khoản
  Input:
    - registerDto — body request
   */
  @Post("register")
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  /*
  POST /auth/login — đăng nhập, trả JWT token
  Input:
    - loginDto — body request
   */
  @Post("login")
  @HttpCode(HttpStatus.OK) // Trả về 200 thay vì mặc định 201
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }
}
