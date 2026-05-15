// DTO body PATCH /sample-essays/:id
import { PartialType } from "@nestjs/mapped-types";
import { CreateSampleEssayDto } from "./create-sample-essay.dto";

export class UpdateSampleEssayDto extends PartialType(CreateSampleEssayDto) {}
