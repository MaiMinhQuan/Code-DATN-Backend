import { IsString, IsNotEmpty, IsOptional, IsInt, IsBoolean, Min, Max } from "class-validator";
import { Type, Transform } from "class-transformer";

export class CreatePipelineJobDto {
  @IsString()
  @IsNotEmpty({ message: "Tên chủ đề không được để trống" })
  topic: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  maxVideos?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  maxEssays?: number;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value !== false && value !== "false")
  skipEssays?: boolean;
}
