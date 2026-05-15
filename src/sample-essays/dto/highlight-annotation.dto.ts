// DTO highlight annotation (embed trong sample essay)
import { IsNumber, IsString, IsEnum, IsOptional, Min } from "class-validator";
import { HighlightType } from "../../common/enums";

export class HighlightAnnotationDto {
  @IsNumber()
  @Min(0)
  startIndex: number;

  @IsNumber()
  @Min(0)
  endIndex: number;

  @IsEnum(HighlightType)
  highlightType: HighlightType;

  @IsString()
  explanation: string;

  @IsOptional()
  @IsString()
  color?: string;
}
