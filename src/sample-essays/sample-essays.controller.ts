// REST /sample-essays — danh sách/chi tiết bài mẫu, CRUD admin.
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

function parseBandQuery(value?: string): number | undefined {
  if (value === undefined || value === "") return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

@Controller("sample-essays")
export class SampleEssaysController {
  constructor(private readonly sampleEssaysService: SampleEssaysService) {}

  @Get()
  async findAll(
    @Query("topicId") topicId?: string,
    @Query("minBand") minBand?: string,
    @Query("maxBand") maxBand?: string,
    @Query("targetBand") targetBand?: TargetBand,
  ) {
    return this.sampleEssaysService.findAll(
      topicId,
      parseBandQuery(minBand),
      parseBandQuery(maxBand),
      targetBand,
      true,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get("admin/all")
  async findAllAdmin(
    @Query("topicId") topicId?: string,
    @Query("minBand") minBand?: string,
    @Query("maxBand") maxBand?: string,
    @Query("targetBand") targetBand?: TargetBand,
  ) {
    return this.sampleEssaysService.findAll(
      topicId,
      parseBandQuery(minBand),
      parseBandQuery(maxBand),
      targetBand,
    );
  }

  @Get(":id")
  async findOne(@Param("id") id: string) {
    return this.sampleEssaysService.findOne(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post()
  async create(@Body() createDto: CreateSampleEssayDto) {
    return this.sampleEssaysService.create(createDto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Patch(":id")
  async update(
    @Param("id") id: string,
    @Body() updateDto: UpdateSampleEssayDto,
  ) {
    return this.sampleEssaysService.update(id, updateDto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Delete(":id")
  async remove(@Param("id") id: string) {
    return this.sampleEssaysService.remove(id);
  }
}
