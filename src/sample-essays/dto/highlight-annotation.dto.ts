import { IsNumber, IsString, IsEnum, IsOptional, Min } from "class-validator";
import { HighlightType } from "../../common/enums";

export class HighlightAnnotationDto {
  @IsNumber()
  @Min(0)
  startIndex: number;          // Vị trí bắt đầu trong fullEssayContent

  @IsNumber()
  @Min(0)
  endIndex: number;            // Vị trí kết thúc

  @IsEnum(HighlightType)
  highlightType: HighlightType; // VOCABULARY | GRAMMAR | STRUCTURE | ARGUMENT

  @IsString()
  explanation: string;          // Giải thích bằng tiếng Việt

  @IsOptional()
  @IsString()
  color?: string;               // Hex color (optional): "#FF5733"
}
