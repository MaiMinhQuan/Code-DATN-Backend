// DTO body POST /lessons/:id/videos
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsUrl,
  MaxLength,
  Min
} from "class-validator";

export class AddVideoDto {
  @IsString({ message: "Tiêu đề video phải là chuỗi ký tự" })
  @IsNotEmpty({ message: "Tiêu đề video không được để trống" })
  @MaxLength(200, { message: "Tiêu đề video không được vượt quá 200 ký tự" })
  title: string;

  @IsUrl({}, { message: "videoUrl phải là URL hợp lệ" })
  @IsNotEmpty({ message: "videoUrl không được để trống" })
  videoUrl: string;

  @IsNumber({}, { message: "duration phải là số (giây)" })
  @IsOptional()
  @Min(1, { message: "duration phải lớn hơn 0" })
  duration?: number;

  @IsUrl({}, { message: "thumbnailUrl phải là URL hợp lệ" })
  @IsOptional()
  thumbnailUrl?: string;
}
