import { Controller, Get, Post, Patch, Body, Param, UseGuards } from "@nestjs/common";
import { PipelineService } from "./pipeline.service";
import { CreatePipelineJobDto } from "./dto/create-pipeline-job.dto";
import { UpdateCandidatesDto } from "./dto/update-candidates.dto";
import { UpdateLessonsDto } from "./dto/update-lessons.dto";
import { JwtAuthGuard } from "@/auth/guards/jwt-auth.guard";
import { RolesGuard } from "@/auth/guards/roles.guard";
import { Roles } from "@/auth/decorators/roles.decorator";
import { UserRole } from "@/common/enums";

@Controller("pipeline")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class PipelineController {
  constructor(private readonly pipelineService: PipelineService) {}

  @Post("jobs")
  create(@Body() dto: CreatePipelineJobDto) {
    return this.pipelineService.create(dto);
  }

  @Get("jobs")
  findAll() {
    return this.pipelineService.findAll();
  }

  @Get("jobs/:jobId")
  findOne(@Param("jobId") jobId: string) {
    return this.pipelineService.findOne(jobId);
  }

  @Get("jobs/:jobId/candidates")
  findCandidates(@Param("jobId") jobId: string) {
    return this.pipelineService.findCandidates(jobId);
  }

  @Patch("jobs/:jobId/candidates")
  updateCandidates(
    @Param("jobId") jobId: string,
    @Body() dto: UpdateCandidatesDto,
  ) {
    return this.pipelineService.updateCandidates(jobId, dto);
  }

  @Get("jobs/:jobId/lessons")
  findLessons(@Param("jobId") jobId: string) {
    return this.pipelineService.findLessons(jobId);
  }

  @Patch("jobs/:jobId/lessons")
  updateLessons(
    @Param("jobId") jobId: string,
    @Body() dto: UpdateLessonsDto,
  ) {
    return this.pipelineService.updateLessons(jobId, dto);
  }

  @Post("jobs/:jobId/analyze")
  analyze(@Param("jobId") jobId: string) {
    return this.pipelineService.analyze(jobId);
  }

  @Post("jobs/:jobId/seed")
  seed(@Param("jobId") jobId: string) {
    return this.pipelineService.seed(jobId);
  }
}
