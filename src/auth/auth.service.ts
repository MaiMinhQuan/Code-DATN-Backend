import {Injectable, ConflictException, UnauthorizedException} from "@nestjs/common";
import {InjectModel} from "@nestjs/mongoose";
import {Model} from "mongoose";
import {JwtService} from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import {User} from "@/schemas/user.schema";
import {RegisterDto} from "./dto/register.dto";
import {LoginDto} from "./dto/login.dto";
import {UserRole} from "@/common/enums";

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    private jwtService: JwtService,
  ) {}

  // Đăng ký tài khoản mới
  async register(registerDto: RegisterDto) {
    const {email, password, fullName} = registerDto;

    // Kiểm tra email đã tồn tại chưa
    const existingUser = await this.userModel.findOne({email}).exec();
    if (existingUser) {
      throw new ConflictException("Email đã được sử dụng");
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Tạo user mới (mặc định role là STUDENT)
    const newUser = new this.userModel({
      email,
      passwordHash,
      fullName,
      role: UserRole.STUDENT,
      isActive: true,
    });

    await newUser.save();

    // Trả về user (không bao gồm passwordHash)
    return {
      _id: newUser._id,
      email: newUser.email,
      fullName: newUser.fullName,
      role: newUser.role,
    };
  }

  // Đăng nhập
  async login(loginDto: LoginDto) {
    const {email, password} = loginDto;

    // Tìm user theo email
    const user = await this.userModel.findOne({email}).exec();
    if (!user) {
      throw new UnauthorizedException("Email không đúng");
    }

    if (!user.isActive) {
      throw new UnauthorizedException("Tài khoản đã bị khóa");
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException("Mật khẩu không đúng");
    }

    user.lastLoginAt = new Date();
    await user.save();

    // Tạo JWT Token
    const payload = {
      sub: user._id.toString(),
      email: user.email,
      role: user.role,
    };
    const accessToken = this.jwtService.sign(payload);

    // Trả về token và user info
    return {
      accessToken,
      user: {
        _id: user._id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        avatarUrl: user.avatarUrl,
      },
    };
  }

  // Validate user từ JWT payload
  async validateUser(userId: string) {
    const user = await this.userModel.findById(userId).exec();
    if (!user || !user.isActive) {
      return null;
    }
    return user;
  }

}
