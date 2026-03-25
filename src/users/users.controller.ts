import { Controller, Get, Patch, Delete, Body, Param, Query, UseGuards, ParseIntPipe } from "@nestjs/common";
import { UsersService } from "./users.service";
import { JwtAuthGuard } from "@/auth/guards/jwt-auth.guard";
import { RolesGuard } from "@/auth/guards/roles.guard";
import { Roles } from "@/auth/decorators/roles.decorator";
import { CurrentUser } from "@/auth/decorators/current-user.decorator";
import { UserDocument } from "@/schemas/user.schema";
import { UserRole } from "@/common/enums";
import { UpdateProfileDto } from "./dto/update-profile.dto";
import { UpdateUserAdminDto } from "./dto/update-user-admin.dto";

@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // GET /api/users/profile
  // Lấy thông tin profile của user đang đăng nhập
  @UseGuards(JwtAuthGuard)
  @Get("profile")
  async getProfile(@CurrentUser() user: UserDocument) {
    return this.usersService.getProfile(user._id.toString());
  }

  // PATCH /api/users/profile
  // Cập nhật profile của user đang đăng nhập
  @UseGuards(JwtAuthGuard)
  @Patch("profile")
  async updateProfile(
    @CurrentUser() user: UserDocument,
    @Body() updateProfileDto: UpdateProfileDto,
  ) {
    return this.usersService.updateProfile(user._id.toString(), updateProfileDto);
  }

  // GET /api/users
  // Lấy danh sách tất cả user (chỉ cho admin)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get()
  async findAll(
    @Query("page", new ParseIntPipe({ optional: true})) page?: number,
    @Query("limit", new ParseIntPipe({ optional: true})) limit?: number,
    @Query("role") role?: string,
  ) {
    return this.usersService.findAll(page, limit, role);
  }

  // GET /api/users/:id
  // Lấy thông tin chi tiết của 1 user
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get(":id")
  async findOne(@Param("id") id: string) {
    return this.usersService.findOne(id);
  }

  // PATCH /api/users/:id
  // Cập nhật thông tin user (chỉ cho admin)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Patch(":id")
  async updateUser(
    @Param("id") id: string,
    @Body() updateUserAdminDto: UpdateUserAdminDto,
  ) {
    return this.usersService.updateUser(id, updateUserAdminDto);
  }

  // DELETE /api/users/:id
  // Xóa user (chỉ cho admin)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Delete(":id")
  async removeUser(@Param("id") id: string, @CurrentUser() currentUser: UserDocument) {
    return this.usersService.removeUser(id, currentUser._id.toString());
  }
}
