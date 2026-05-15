// DTO body PATCH /flashcard-sets/cards/:cardId/review
import { IsInt, IsIn } from "class-validator";

export class UpdateReviewDto {
  @IsInt({ message: "Chất lượng ôn tập phải là số nguyên" })
  @IsIn([0, 1, 2, 3, 4, 5], { message: "Chất lượng ôn tập phải từ 0-5" })
  quality: number;
}
