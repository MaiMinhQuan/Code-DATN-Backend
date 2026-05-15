// Service Auth: đăng ký, đăng nhập, tạo JWT token, validate user cho JwtStrategy.
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

  /*
  Tạo tài khoản mới, hash password và set role mặc định STUDENT
  Input:
    - registerDto — body request
   */
  async register(registerDto: RegisterDto) {
    const {email, password, fullName} = registerDto;

    const existingUser = await this.userModel.findOne({email}).exec();
    if (existingUser) {
      throw new ConflictException("Email đã được sử dụng");
    }

    // Hash với cost factor 10 (cân bằng tốt giữa bảo mật và hiệu năng)
    const passwordHash = await bcrypt.hash(password, 10);

    // User mới luôn bắt đầu với role STUDENT; có thể được admin nâng quyền sau
    const newUser = new this.userModel({
      email,
      passwordHash,
      fullName,
      role: UserRole.STUDENT,
      isActive: true,
    });

    await newUser.save();

    return {
      _id: newUser._id,
      email: newUser.email,
      fullName: newUser.fullName,
      role: newUser.role,
    };
  }

  /*
  Đăng nhập: check email/password/isActive, cập nhật lastLoginAt và trả accessToken
  Input:
    - loginDto — body request
   */
  async login(loginDto: LoginDto) {
    const {email, password} = loginDto;

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

    // Ghi lại thời gian đăng nhập cuối để phục vụ kiểm tra lịch sử
    user.lastLoginAt = new Date();
    await user.save();

    // Tạo JWT payload tối giản; document user đầy đủ được lấy theo từng request bởi JwtStrategy
    const payload = {
      sub: user._id.toString(),
      email: user.email,
      role: user.role,
    };
    const accessToken = this.jwtService.sign(payload);

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

  /*
  Validate user theo userId (sub trong JWT), trả null nếu user không tồn tại/không active
  Input:
    - userId — id user
   */
  async validateUser(userId: string) {
    const user = await this.userModel.findById(userId).exec();
    if (!user || !user.isActive) {
      return null;
    }
    return user;
  }
}
