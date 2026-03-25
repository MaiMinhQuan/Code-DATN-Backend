import { PartialType } from "@nestjs/mapped-types";
import { CreateFlashcardSetDto } from "./create-flashcard-set.dto";

// DTO cho PATCH /api/flashcard-sets/:id - Cập nhật flashcard set
export class UpdateFlashcardSetDto extends PartialType(CreateFlashcardSetDto) {}
