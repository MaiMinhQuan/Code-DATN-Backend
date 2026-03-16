import { IsEnum, IsOptional, IsMongoId, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { SubmissionStatus } from '@/common/enums';

export class QuerySubmissionDto {
  @IsMongoId()
  @IsOptional()
  questionId?: string;

  @IsEnum(SubmissionStatus)
  @IsOptional()
  status?: SubmissionStatus;

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  @Min(1)
  page?: number = 1;

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(50)
  limit?: number = 10;
}
