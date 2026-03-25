import { IsString, IsNotEmpty, IsOptional } from "class-validator";

// DTO cho POST /api/notebook - Tạo mới một ghi chú
export class CreateNoteDto {
  @IsString({ message: "Nội dung ghi chú phải là chuỗi" })
  @IsNotEmpty({ message: "Nội dung ghi chú không được để trống" })
  userDraftNote: string;

  @IsOptional()
  @IsString({ message: "Tiêu đề phải là chuỗi" })
  title?: string;
}
