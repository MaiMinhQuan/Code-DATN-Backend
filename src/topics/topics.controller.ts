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
  constructor(private readonly topicsService: TopicsService) {}

  /*
  GET /topics — danh sách topic
  Input:
    - showAll — query optional; true thì trả cả topic ẩn
   */
  @Get()
  async findAll(@Query("showAll", new ParseBoolPipe({ optional: true})) showAll?: boolean) {
    return this.topicsService.findAll(showAll);
  }

  /*
  GET /topics/:identifier — chi tiết một topic
  Input:
    - identifier — id Mongo hoặc slug trên URL
   */
  @Get(":identifier")
  async findOne(@Param("identifier") identifier: string) {
    return this.topicsService.findOne(identifier);
  }

  /*
  POST /topics — tạo topic (admin)
  Input:
    - createTopicDto — body request
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post()
  async create(@Body() createTopicDto: CreateTopicDto) {
    return this.topicsService.create(createTopicDto);
  }

  /*
  PATCH /topics/:id — cập nhật topic (admin)
  Input:
    - id — _id topic trên URL
    - updateTopicDto — body request
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Patch(":id")
  async update(
    @Param("id") id: string,
    @Body() updateTopicDto: UpdateTopicDto,
  ) {
    return this.topicsService.update(id, updateTopicDto);
  }

  /*
  DELETE /topics/:id — ẩn topic soft-delete (admin)
  Input:
    - id — _id topic trên URL
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Delete(":id")
  async remove(@Param("id") id: string) {
    return this.topicsService.remove(id);
  }
}
