import { IsString, IsNotEmpty, IsOptional } from "class-validator";

// DTO cho POST /api/flashcard-sets - Tạo bộ thẻ flashcard mới
export class CreateFlashcardSetDto {
  @IsString({ message: "Tiêu đề phải là chuỗi" })
  @IsNotEmpty({ message: "Tiêu đề không được để trống" })
  title: string;

  @IsOptional()
  @IsString({ message: "Mô tả phải là chuỗi" })
  description?: string;
}
