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

  // GET /api/sample-essays?topicId=xxx&targetBand=xxx
  // Lấy danh sách bài mẫu, có thể filter theo topicId và targetBand
  @Get()
  async findAll(
    @Query("topicId") topicId?: string,
    @Query("targetBand") targetBand?: TargetBand,
  ) {
    return this.sampleEssaysService.findAll(topicId, targetBand);
  }

  // GET /api/sample-essays/:id
  // Lấy chi tiết bài mẫu theo ID
  @Get(":id")
  async findOne(@Param("id") id: string) {
    return this.sampleEssaysService.findOne(id);
  }

  // POST /api/sample-essays/:id/view
  // Tăng viewCount khi user xem bài mẫu
  @Post(":id/view")
  async incrementViewCount(@Param("id") id: string) {
    return this.sampleEssaysService.incrementViewCount(id);
  }

  // POST /api/sample-essays
  // Tạo bài mẫu mới (Admin)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post()
  async create(@Body() createDto: CreateSampleEssayDto) {
    return this.sampleEssaysService.create(createDto);
  }

  // PATCH /api/sample-essays/:id
  // Cập nhật bài mẫu (Admin)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Patch(":id")
  async update(
    @Param("id") id: string,
    @Body() updateDto: UpdateSampleEssayDto,
  ) {
    return this.sampleEssaysService.update(id, updateDto);
  }

  // DELETE /api/sample-essays/:id
  // Xoá bài mẫu (Admin)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Delete(":id")
  async remove(@Param("id") id: string) {
    return this.sampleEssaysService.remove(id);
  }
}
