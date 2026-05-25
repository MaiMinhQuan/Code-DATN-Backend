import { IsArray, IsInt } from "class-validator";

export class UpdateLessonsDto {
  @IsArray()
  @IsInt({ each: true })
  approvedIndexes: number[];
}
