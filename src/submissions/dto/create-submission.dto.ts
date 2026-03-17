import {
  IsString,
  IsNotEmpty,
  IsMongoId,
  IsOptional,
  IsNumber,
  Min,
  MinLength,
} from 'class-validator';

export class CreateSubmissionDto {
  @IsMongoId({ message: 'questionId phải là MongoDB ObjectId hợp lệ' })
  @IsNotEmpty({ message: 'questionId không được để trống' })
  questionId: string;

  @IsString({ message: 'essayContent phải là chuỗi' })
  @IsNotEmpty({ message: 'essayContent không được để trống' })
  @MinLength(50, { message: 'Bài viết phải có ít nhất 50 ký tự' })
  essayContent: string;

  @IsNumber({}, { message: 'timeSpentSeconds phải là số' })
  @IsOptional()
  @Min(0, { message: 'timeSpentSeconds phải >= 0' })
  timeSpentSeconds?: number;
}
