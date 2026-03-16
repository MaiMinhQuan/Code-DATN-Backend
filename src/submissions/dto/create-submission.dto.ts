import { IsString, IsNotEmpty, IsMongoId, IsOptional, IsNumber, Min, Max } from 'class-validator';

export class CreateSubmissionDto {
  @IsMongoId()
  @IsNotEmpty()
  questionId: string;

  @IsString()
  @IsNotEmpty()
  essayContent: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  timeSpentSeconds?: number;
}
