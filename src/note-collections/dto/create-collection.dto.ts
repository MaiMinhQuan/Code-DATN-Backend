import { IsString, IsNotEmpty, IsOptional } from "class-validator";

export class CreateCollectionDto {
  @IsString({ message: "Tên bộ sưu tập phải là chuỗi" })
  @IsNotEmpty({ message: "Tên bộ sưu tập không được để trống" })
  name: string;

  @IsOptional()
  @IsString({ message: "Màu phải là chuỗi hex" })
  color?: string;
}