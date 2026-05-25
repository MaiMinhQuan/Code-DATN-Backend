import { IsArray, IsInt, Min } from "class-validator";

export class UpdateCandidatesDto {
  @IsArray()
  @IsInt({ each: true })
  @Min(0, { each: true })
  approvedIndexes: number[];
}
