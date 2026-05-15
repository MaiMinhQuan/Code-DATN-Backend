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

  /*
  GET /users/profile — trả profile user đang đăng nhập
  Input:
    - user từ JWT (@CurrentUser)
  */
  @UseGuards(JwtAuthGuard)
  @Get("profile")
  async getProfile(@CurrentUser() user: UserDocument) {
    return this.usersService.getProfile(user._id.toString());
  }

  /*
  PATCH /users/profile — cập nhật tên/avatar của user
  Input:
    - user JWT
    - updateProfileDto — body request
   */
  @UseGuards(JwtAuthGuard)
  @Patch("profile")
  async updateProfile(
    @CurrentUser() user: UserDocument,
    @Body() updateProfileDto: UpdateProfileDto,
  ) {
    return this.usersService.updateProfile(user._id.toString(), updateProfileDto);
  }

  /*
  GET /users — danh sách user
  Input:
    - query page, limit (optional)
    - role (optional)
   */
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

  /*
  GET /users/:id — chi tiết một user (admin)
  Input:
    - id của user trên URL
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get(":id")
  async findOne(@Param("id") id: string) {
    return this.usersService.findOne(id);
  }

  /*
  PATCH /users/:id — admin sửa user (tên, avatar, role, trạng thái)
  Input:
    - id của user trên URL
    - updateUserAdminDto — body request
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Patch(":id")
  async updateUser(
    @Param("id") id: string,
    @Body() updateUserAdminDto: UpdateUserAdminDto,
  ) {
    return this.usersService.updateUser(id, updateUserAdminDto);
  }

  /*
  DELETE /users/:id — khóa mềm user; không cho tự xóa chính mình (admin)
  Input:
    - id của user trên URL
    - currentUser từ JWT
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Delete(":id")
  async removeUser(@Param("id") id: string, @CurrentUser() currentUser: UserDocument) {
    return this.usersService.removeUser(id, currentUser._id.toString());
  }
}
