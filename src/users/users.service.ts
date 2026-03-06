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

  // GET /api/users/profile
  // Lấy thông tin profile của user hiện tại
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
    }
  }

  // PATCH /api/users/profile
  // Cập nhật fullName và avatarUrl
  async updateProfile(userId: string, updateProfileDto: UpdateProfileDto) {
    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      throw new NotFoundException("Không tìm thấy user");
    }

    // Update
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

  // GET /api/users
  // Lấy danh sách tất cả user (chỉ cho admin)
  async findAll(page: number = 1, limit: number = 20, role?: string) {
    const skip = (page - 1) * limit;
    const filter: any = {};

    // Lọc theo role nếu có
    if (role) {
      filter.role = role;
    }

    const [users, total] = await Promise.all([
      this.userModel
        .find(filter)
        .select("-password") // Không trả về password
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

  // GET /api/users/:id
  // Lấy thông tin chi tiết của 1 user (chỉ cho admin)
  async findOne(userId: string) {
    const user = await this.userModel.findById(userId).select("-passwordHash").exec();
    if (!user) {
      throw new NotFoundException("Không tìm thấy user");
    }
    return user;
  }

  // PATCH /api/users/:id
  // Cập nhật thông tin user (chỉ cho admin, admin có thể update: fullName, avatarUrl, role, isActive)
  async updateUser(userId: string, updateUserAdminDto: UpdateUserAdminDto) {
    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      throw new NotFoundException("Không tìm thấy user");
    }

    // Update
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
    }
  }

  // DELETE /api/users/:id
  // Xóa user (chỉ cho admin, xóa mềm)
  async removeUser(userId: string, currentUserId: string) {
    // Không cho phép tự xóa chính mình
    if (userId === currentUserId) {
      throw new ForbiddenException("Bạn không thể xóa chính mình");
    }

    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      throw new NotFoundException("Không tìm thấy user");
    }

    // Xóa mềm
    user.isActive = false;
    await user.save();

    return {
      message: "Đã khóa tài khoản user thành công",
      userId: user._id,
    };
  }
}
