import { IsMongoId, IsNotEmpty } from "class-validator";

export class AddFavoriteDto {
  @IsMongoId({ message: "essayId phải là MongoDB ObjectId hợp lệ" })
  @IsNotEmpty({ message: "essayId không được để trống" })
  essayId: string;
}
