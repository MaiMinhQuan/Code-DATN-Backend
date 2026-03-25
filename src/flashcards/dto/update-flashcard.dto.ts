import { PartialType } from "@nestjs/mapped-types";
import { CreateFlashcardDto } from "./create-flashcard.dto";

// DTO cho PATCH /api/flashcard-sets/:setId/flashcards/:id - Cập nhật flashcard
export class UpdateFlashcardDto extends PartialType(CreateFlashcardDto) {}
