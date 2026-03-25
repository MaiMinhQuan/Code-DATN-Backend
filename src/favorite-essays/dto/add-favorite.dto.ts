import { IsMongoId, IsNotEmpty, IsOptional, IsString } from "class-validator";

// DTO cho POST /api/favorite-essays - Thêm bài mẫu vào danh sách yêu thích của user
export class AddFavoriteDto {
  @IsMongoId({ message: "essayId phải là MongoDB ObjectId hợp lệ" })
  @IsNotEmpty({ message: "essayId không được để trống" })
  essayId: string;

  @IsOptional()
  @IsString({ message: "personalNote phải là chuỗi" })
  personalNote?: string;
}
