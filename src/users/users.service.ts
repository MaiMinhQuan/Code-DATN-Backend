// Service xử lý profile user và thao tác quản trị danh sách user.
import {Injectable, NotFoundException, ForbiddenException} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { User } from "@/schemas/user.schema";
import { UpdateProfileDto } from "./dto/update-profile.dto";
import { UpdateUserAdminDto } from "./dto/update-user-admin.dto";

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
  ) {}

  /*
  Lấy các trường profile công khai (không có mật khẩu)
  Input:
    - userId — id của user cần đọc
   */
  async getProfile(userId: string) {
    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      throw new NotFoundException("Không tìm thấy user");
    }

    return {
      _id: user._id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      avatarUrl: user.avatarUrl,
      isActive: user.isActive,
      lastLoginAt: user.lastLoginAt,
    };
  }

  /*
  User cập nhật profile (chỉ các trường có trong body)
  Input:
    - userId — id của user
    - updateProfileDto — body request
   */
  async updateProfile(userId: string, updateProfileDto: UpdateProfileDto) {
    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      throw new NotFoundException("Không tìm thấy user");
    }

    // Chỉ gán các trường được gửi trong request
    if (updateProfileDto.fullName !== undefined) {
      user.fullName = updateProfileDto.fullName;
    }
    if (updateProfileDto.avatarUrl !== undefined) {
      user.avatarUrl = updateProfileDto.avatarUrl;
    }

    await user.save();

    return {
      _id: user._id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      avatarUrl: user.avatarUrl,
      isActive: user.isActive,
    };
  }

  /*
  Lấy danh sách user
  Input:
    - page — trang
    - limit — số bản ghi/trang
    - role — lọc role (tùy chọn)
   */
  async findAll(page: number = 1, limit: number = 20, role?: string) {
    const skip = (page - 1) * limit;
    const filter: any = {};

    if (role) {
      filter.role = role;
    }

    const [users, total] = await Promise.all([
      this.userModel
        .find(filter)
        .select("-password") // Ẩn hash mật khẩu, không trả về client
        .sort({createdAt: -1})
        .skip(skip)
        .limit(limit)
        .exec(),
      this.userModel.countDocuments(filter).exec(),
    ]);

    return {
      data: users,
      pagination: {
        total,
        page,
        limit,
        totalPage: Math.ceil(total / limit),
      },
    };
  }

  /*
  Lấy một user theo id
  Input:
    - userId — id của user cần xem
   */
  async findOne(userId: string) {
    const user = await this.userModel.findById(userId).select("-passwordHash").exec();
    if (!user) {
      throw new NotFoundException("Không tìm thấy user");
    }
    return user;
  }

  /*
  Admin cập nhật profile user
  Input:
    - userId — id của user bị sửa
    - updateUserAdminDto — body request
   */
  async updateUser(userId: string, updateUserAdminDto: UpdateUserAdminDto) {
    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      throw new NotFoundException("Không tìm thấy user");
    }

    // Chỉ áp dụng các trường có trong body
    if (updateUserAdminDto.fullName !== undefined) {
      user.fullName = updateUserAdminDto.fullName;
    }
    if (updateUserAdminDto.avatarUrl !== undefined) {
      user.avatarUrl = updateUserAdminDto.avatarUrl;
    }
    if (updateUserAdminDto.role !== undefined) {
      user.role = updateUserAdminDto.role;
    }
    if (updateUserAdminDto.isActive !== undefined) {
      user.isActive = updateUserAdminDto.isActive;
    }

    await user.save();

    return {
      _id: user._id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      avatarUrl: user.avatarUrl,
      isActive: user.isActive,
    };
  }

  /*
  Khóa mềm user (isActive = false)
  Input:
    - userId — id của user bị khóa
    - currentUserId — id của admin đang thực hiện
   */
  async removeUser(userId: string, currentUserId: string) {
    // Không cho admin tự vô hiệu hóa tài khoản của chính mình
    if (userId === currentUserId) {
      throw new ForbiddenException("Bạn không thể xóa chính mình");
    }

    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      throw new NotFoundException("Không tìm thấy user");
    }

    // Khóa mềm
    user.isActive = false;
    await user.save();

    return {
      message: "Đã khóa tài khoản user thành công",
      userId: user._id,
    };
  }
}
