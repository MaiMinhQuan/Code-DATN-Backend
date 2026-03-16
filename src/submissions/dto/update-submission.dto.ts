import { IsString, IsOptional, IsNumber, Min } from 'class-validator';

export class UpdateSubmissionDto {
  @IsString()
  @IsOptional()
  essayContent?: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  timeSpentSeconds?: number;
}
