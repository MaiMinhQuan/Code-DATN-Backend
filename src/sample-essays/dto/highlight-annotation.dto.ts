// DTO highlight annotation (embed trong sample essay)
import { IsString, IsEnum, IsOptional, MinLength } from "class-validator";
import { HighlightType } from "../../common/enums";

export class HighlightAnnotationDto {
  @IsString()
  @MinLength(1)
  text: string;

  @IsEnum(HighlightType)
  highlightType: HighlightType;

  @IsString()
  explanation: string;

  @IsOptional()
  @IsString()
  color?: string;
}
