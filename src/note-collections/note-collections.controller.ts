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

  // GET /api/note-collections
  @Get()
  findAll(@Req() req) {
    return this.service.findAll(req.user._id.toString());
  }

  // POST /api/note-collections
  @Post()
  create(@Req() req, @Body() dto: CreateCollectionDto) {
    return this.service.create(req.user._id.toString(), dto);
  }

  // PATCH /api/note-collections/:id
  @Patch(":id")
  update(@Req() req, @Param("id") id: string, @Body() dto: UpdateCollectionDto) {
    return this.service.update(id, req.user._id.toString(), dto);
  }

  // DELETE /api/note-collections/:id
  @Delete(":id")
  delete(@Req() req, @Param("id") id: string) {
    return this.service.delete(id, req.user._id.toString());
  }
}
