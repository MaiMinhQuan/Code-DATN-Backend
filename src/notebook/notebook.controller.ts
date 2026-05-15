// REST /notebook — CRUD note theo user, filter theo collectionId.
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

  /*
  GET /notebook — danh sách note của user (filter collectionId)
  Input:
    - req.user — user từ JWT
    - collectionId — query optional ("none" hoặc ObjectId)
   */
  @UseGuards(JwtAuthGuard)
  @Get()
  async findAll(@Req() req, @Query("collectionId") collectionId?: string) {
    const userId = req.user._id.toString();
    return this.notebookService.findAll(userId, collectionId);
  }

  /*
  GET /notebook/:id — chi tiết note (check ownership)
  Input:
    - req.user — user từ JWT
    - id — id note trên URL
   */
  @UseGuards(JwtAuthGuard)
  @Get(":id")
  async findOne(@Req() req, @Param("id") id: string) {
    const userId = req.user._id.toString();
    return this.notebookService.findOne(id, userId);
  }

  /*
  POST /notebook — tạo note
  Input:
    - req.user — user từ JWT
    - createNoteDto — body request
   */
  @UseGuards(JwtAuthGuard)
  @Post()
  async create(@Req() req, @Body() createNoteDto: CreateNoteDto) {
    const userId = req.user._id.toString();
    return this.notebookService.create(userId, createNoteDto);
  }

  /*
  PATCH /notebook/:id — cập nhật note
  Input:
    - req.user — user từ JWT
    - id — id note trên URL
    - updateNoteDto — body request
   */
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

  /*
  DELETE /notebook/:id — xóa note
  Input:
    - req.user — user từ JWT
    - id — id note trên URL
   */
  @UseGuards(JwtAuthGuard)
  @Delete(":id")
  async delete(@Req() req, @Param("id") id: string) {
    const userId = req.user._id.toString();
    return this.notebookService.delete(id, userId);
  }
}
