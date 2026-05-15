// REST /sample-essays — danh sách/chi tiết bài mẫu, tăng view, CRUD admin.
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
} from "@nestjs/common";
import { SampleEssaysService } from "./sample-essays.service";
import { CreateSampleEssayDto } from "./dto/create-sample-essay.dto";
import { UpdateSampleEssayDto } from "./dto/update-sample-essay.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { UserRole, TargetBand } from "../common/enums";

@Controller("sample-essays")
export class SampleEssaysController {
  constructor(private readonly sampleEssaysService: SampleEssaysService) {}

  /*
  GET /sample-essays — danh sách bài mẫu (filter)
  Input:
    - topicId — query optional
    - targetBand — query optional
   */
  @Get()
  async findAll(
    @Query("topicId") topicId?: string,
    @Query("targetBand") targetBand?: TargetBand,
  ) {
    return this.sampleEssaysService.findAll(topicId, targetBand);
  }

  /*
  GET /sample-essays/:id — chi tiết bài mẫu
  Input:
    - id — id essay trên URL
   */
  @Get(":id")
  async findOne(@Param("id") id: string) {
    return this.sampleEssaysService.findOne(id);
  }

  /*
  POST /sample-essays/:id/view — tăng viewCount
  Input:
    - id — id essay trên URL
   */
  @Post(":id/view")
  async incrementViewCount(@Param("id") id: string) {
    return this.sampleEssaysService.incrementViewCount(id);
  }

  /*
  POST /sample-essays — tạo bài mẫu (admin)
  Input:
    - createDto — body request
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post()
  async create(@Body() createDto: CreateSampleEssayDto) {
    return this.sampleEssaysService.create(createDto);
  }

  /*
  PATCH /sample-essays/:id — cập nhật bài mẫu (admin)
  Input:
    - id — id essay trên URL
    - updateDto — body request
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Patch(":id")
  async update(
    @Param("id") id: string,
    @Body() updateDto: UpdateSampleEssayDto,
  ) {
    return this.sampleEssaysService.update(id, updateDto);
  }

  /*
  DELETE /sample-essays/:id — ẩn bài mẫu (admin)
  Input:
    - id — id essay trên URL
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Delete(":id")
  async remove(@Param("id") id: string) {
    return this.sampleEssaysService.remove(id);
  }
}
