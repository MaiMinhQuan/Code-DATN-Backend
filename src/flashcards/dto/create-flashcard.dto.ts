import { IsString, IsNotEmpty, IsOptional, IsDate } from "class-validator";
import { Type } from "class-transformer";


// DTO cho POST /api/flashcard-sets/:setId/flashcards - Thêm flashcard vào set
export class CreateFlashcardDto {
  @IsString({ message: "Nội dung mặt trước phải là chuỗi" })
  @IsNotEmpty({ message: "Nội dung mặt trước không được để trống" })
  frontContent: string;

  @IsString({ message: "Nội dung mặt sau phải là chuỗi" })
  @IsNotEmpty({ message: "Nội dung mặt sau không được để trống" })
  backContent: string;

  @IsOptional()
  @IsDate({ message: "Ngày ôn tập phải là định dạng Date" })
  @Type(() => Date)
  nextReviewDate?: Date;
}
