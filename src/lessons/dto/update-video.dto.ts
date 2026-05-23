// DTO body PATCH /lessons/:id/videos/:index
import { PartialType } from "@nestjs/mapped-types";
import { AddVideoDto } from "./add-video.dto";

export class UpdateVideoDto extends PartialType(AddVideoDto) {}
