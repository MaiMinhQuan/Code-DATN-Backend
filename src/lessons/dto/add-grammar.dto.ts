// DTO body POST /lessons/:id/grammars
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  IsNumber,
  MaxLength,
  Min,
} from "class-validator";

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

  @IsNumber({}, { message: "timestamp phải là số (giây)" })
  @IsOptional()
  @Min(0, { message: "timestamp phải >= 0" })
  timestamp?: number;

  @IsString({ message: "contextSentence phải là chuỗi ký tự" })
  @IsOptional()
  @MaxLength(500, { message: "contextSentence không được vượt quá 500 ký tự" })
  contextSentence?: string;
}
