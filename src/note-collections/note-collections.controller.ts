// REST /note-collections — CRUD collection ghi chú theo user (cần JWT).
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
} from "@nestjs/common";
import { NoteCollectionsService } from "./note-collections.service";
import { CreateCollectionDto } from "./dto/create-collection.dto";
import { UpdateCollectionDto } from "./dto/update-collection.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

@UseGuards(JwtAuthGuard)
@Controller("note-collections")
export class NoteCollectionsController {
  constructor(private readonly service: NoteCollectionsService) {}

  /*
  GET /note-collections — danh sách collection của user
  Input:
    - req.user — user từ JWT
   */
  @Get()
  findAll(@Req() req) {
    return this.service.findAll(req.user._id.toString());
  }

  /*
  POST /note-collections — tạo collection
  Input:
    - req.user — user từ JWT
    - dto — body request
   */
  @Post()
  create(@Req() req, @Body() dto: CreateCollectionDto) {
    return this.service.create(req.user._id.toString(), dto);
  }

  /*
  PATCH /note-collections/:id — cập nhật collection (owner-only)
  Input:
    - req.user — user từ JWT
    - id — id collection trên URL
    - dto — body request
   */
  @Patch(":id")
  update(@Req() req, @Param("id") id: string, @Body() dto: UpdateCollectionDto) {
    return this.service.update(id, req.user._id.toString(), dto);
  }

  /*
  DELETE /note-collections/:id — xóa collection và detach notes (collectionId=null)
  Input:
    - req.user — user từ JWT
    - id — id collection trên URL
   */
  @Delete(":id")
  delete(@Req() req, @Param("id") id: string) {
    return this.service.delete(id, req.user._id.toString());
  }
}
