import { PartialType } from "@nestjs/mapped-types";
import { CreateNoteDto } from "./create-note.dto";

// DTO cho PATCH /api/notebook/:id - Cập nhật thông tin ghi chú
export class UpdateNoteDto extends PartialType(CreateNoteDto) {}
