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
  Req,
} from "@nestjs/common";
import { NotebookService } from "./notebook.service";
import { CreateNoteDto } from "./dto/create-note.dto";
import { UpdateNoteDto } from "./dto/update-note.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

@Controller("notebook")
export class NotebookController {
  constructor(private readonly notebookService: NotebookService) {}

  // GET /api/notebook?collectionId=<id|none>
  // Lấy tất cả ghi chú của user (có thể lọc theo bộ)
  @UseGuards(JwtAuthGuard)
  @Get()
  async findAll(@Req() req, @Query("collectionId") collectionId?: string) {
    const userId = req.user._id.toString();
    return this.notebookService.findAll(userId, collectionId);
  }

  // GET /api/notebook/:id
  // Lấy chi tiết 1 ghi chú
  @UseGuards(JwtAuthGuard)
  @Get(":id")
  async findOne(@Req() req, @Param("id") id: string) {
    const userId = req.user._id.toString();
    return this.notebookService.findOne(id, userId);
  }

  // POST /api/notebook
  // Tạo ghi chú mới
  @UseGuards(JwtAuthGuard)
  @Post()
  async create(@Req() req, @Body() createNoteDto: CreateNoteDto) {
    const userId = req.user._id.toString();
    return this.notebookService.create(userId, createNoteDto);
  }

  // PATCH /api/notebook/:id
  // Cập nhật ghi chú
  @UseGuards(JwtAuthGuard)
  @Patch(":id")
  async update(
    @Req() req,
    @Param("id") id: string,
    @Body() updateNoteDto: UpdateNoteDto,
  ) {
    const userId = req.user._id.toString();
    return this.notebookService.update(id, userId, updateNoteDto);
  }

  // DELETE /api/notebook/:id
  // Xóa ghi chú
  @UseGuards(JwtAuthGuard)
  @Delete(":id")
  async delete(@Req() req, @Param("id") id: string) {
    const userId = req.user._id.toString();
    return this.notebookService.delete(id, userId);
  }
}
