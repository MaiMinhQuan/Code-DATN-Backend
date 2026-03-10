import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseBoolPipe,
} from "@nestjs/common";
import { TopicsService } from "./topics.service";
import { JwtAuthGuard } from "@/auth/guards/jwt-auth.guard";
import { RolesGuard } from "@/auth/guards/roles.guard";
import { Roles } from "@/auth/decorators/roles.decorator";
import { UserRole } from "@/common/enums";
import { CreateTopicDto } from "./dto/create-topic.dto";
import { UpdateTopicDto } from "./dto/update-topic.dto";

@Controller("topics")
export class TopicsController {
  constructor (private readonly topicsService: TopicsService) {}

  // GET /api/topics
  // Lấy danh sách các topic (public, không cần login)
  // Query param: ?showAll=true (chỉ cho admin, xem cả inactive topics)
  @Get()
  async findAll(@Query("showAll", new ParseBoolPipe({ optional: true})) showAll?: boolean) {
    return this.topicsService.findAll(showAll);
  }

  // GET /api/topics/:identifier
  // Lấy chi tiết 1 topic (public, không cần login)
  // identifier có thể là _id hoặc slug
  @Get(":identifier")
  async findOne(@Param("identifier") identifier: string) {
    return this.topicsService.findOne(identifier);
  }

  // POST /api/topics
  // Tạo topic mới (chỉ cho admin)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post()
  async create(@Body() createTopicDto: CreateTopicDto) {
    return this.topicsService.create(createTopicDto);
  }

  // PATCH /api/topics/:id
  // Cập nhật topic (chỉ cho admin)
  // Body: { name?, description?, iconUrl?, orderIndex?, isActive? }
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Patch(":id")
  async update(
    @Param("id") id: string,
    @Body() updateTopicDto: UpdateTopicDto
  ) {
    return this.topicsService.update(id, updateTopicDto)
  }

  // DELETE /api/topics/:id
  // Xóa topic (chỉ cho admin)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Delete(":id")
  async remove(@Param("id") id: string) {
    return this.topicsService.remove(id);
  }
}
