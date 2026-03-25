import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  MaxLength
} from "class-validator";

// DTO cho POST /api/lessons/:lessonId/grammars - Thêm grammar vào lesson
export class AddGrammarDto {
  @IsString({ message: "Tiêu đề ngữ pháp phải là chuỗi ký tự" })
  @IsNotEmpty({ message: "Tiêu đề ngữ pháp không được để trống" })
  @MaxLength(200, { message: "Tiêu đề ngữ pháp không được vượt quá 200 ký tự" })
  title: string;

  @IsString({ message: "Giải thích phải là chuỗi ký tự" })
  @IsNotEmpty({ message: "Giải thích không được để trống" })
  @MaxLength(2000, { message: "Giải thích không được vượt quá 2000 ký tự" })
  explanation: string;

  @IsArray({ message: "examples phải là mảng" })
  @IsOptional()
  @IsString({ each: true, message: "Mỗi example phải là chuỗi ký tự" })
  examples?: string[];

  @IsString({ message: "structure phải là chuỗi ký tự" })
  @IsOptional()
  @MaxLength(200, { message: "structure không được vượt quá 200 ký tự" })
  structure?: string;
}
