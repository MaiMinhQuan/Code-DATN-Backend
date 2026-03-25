import { PartialType } from "@nestjs/mapped-types";
import { CreateSampleEssayDto } from "./create-sample-essay.dto";

// DTO cho PATCH /api/sample-essays/:id - Cập nhật sample essay
export class UpdateSampleEssayDto extends PartialType(CreateSampleEssayDto) {}
