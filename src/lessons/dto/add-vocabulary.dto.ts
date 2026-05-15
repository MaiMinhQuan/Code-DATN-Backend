// DTO body POST /lessons/:id/vocabularies
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  MaxLength
} from "class-validator";

export class AddVocabularyDto {
  @IsString({ message: "Từ vựng phải là chuỗi ký tự" })
  @IsNotEmpty({ message: "Từ vựng không được để trống" })
  @MaxLength(100, { message: "Từ vựng không được vượt quá 100 ký tự" })
  word: string;

  @IsString({ message: "pronunciation phải là chuỗi ký tự" })
  @IsOptional()
  @MaxLength(100, { message: "pronunciation không được vượt quá 100 ký tự" })
  pronunciation?: string;

  @IsString({ message: "Định nghĩa phải là chuỗi ký tự" })
  @IsNotEmpty({ message: "Định nghĩa không được để trống" })
  @MaxLength(500, { message: "Định nghĩa không được vượt quá 500 ký tự" })
  definition: string;

  @IsArray({ message: "examples phải là mảng" })
  @IsOptional()
  @IsString({ each: true, message: "Mỗi example phải là chuỗi ký tự" })
  examples?: string[];

  @IsString({ message: "translation phải là chuỗi ký tự" })
  @IsOptional()
  @MaxLength(500, { message: "translation không được vượt quá 500 ký tự" })
  translation?: string;
}
