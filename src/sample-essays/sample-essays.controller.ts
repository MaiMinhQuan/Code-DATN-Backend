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

  // ====================================
  // GET /api/sample-essays
  // ====================================
  // Query params:
  //   - topicId (optional): Filter theo topic
  //   - targetBand (optional): BAND_5_0 | BAND_6_0 | BAND_7_PLUS
  // Public - không cần auth
  @Get()
  async findAll(
    @Query("topicId") topicId?: string,
    @Query("targetBand") targetBand?: TargetBand,
  ) {
    return this.sampleEssaysService.findAll(topicId, targetBand);
  }

  // ====================================
  // GET /api/sample-essays/:id
  // ====================================
  // Public - không cần auth
  // Return chi tiết bài mẫu + highlightAnnotations
  @Get(":id")
  async findOne(@Param("id") id: string) {
    return this.sampleEssaysService.findOne(id);
  }

  // ====================================
  // POST /api/sample-essays/:id/view
  // ====================================
  // Tăng viewCount khi user xem bài mẫu
  // Public - không cần auth
  @Post(":id/view")
  async incrementViewCount(@Param("id") id: string) {
    return this.sampleEssaysService.incrementViewCount(id);
  }

  // ====================================
  // POST /api/sample-essays
  // ====================================
  // Admin only - Tạo bài mẫu mới
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post()
  async create(@Body() createDto: CreateSampleEssayDto) {
    return this.sampleEssaysService.create(createDto);
  }

  // ====================================
  // PATCH /api/sample-essays/:id
  // ====================================
  // Admin only - Cập nhật bài mẫu
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Patch(":id")
  async update(
    @Param("id") id: string,
    @Body() updateDto: UpdateSampleEssayDto,
  ) {
    return this.sampleEssaysService.update(id, updateDto);
  }

  // ====================================
  // DELETE /api/sample-essays/:id
  // ====================================
  // Admin only - Xóa (ẩn) bài mẫu
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Delete(":id")
  async remove(@Param("id") id: string) {
    return this.sampleEssaysService.remove(id);
  }
}
