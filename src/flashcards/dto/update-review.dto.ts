import { IsInt, IsIn, Min } from "class-validator";

export class UpdateReviewDto {
  // quality: 0-5 (SM-2 algorithm)
  // 0: Hoàn toàn quên
  // 1: Sai, nhưng nhớ lại được khi thấy đáp án
  // 2: Sai, nhưng đáp án dễ nhớ lại
  // 3: Đúng, nhưng khó khăn
  // 4: Đúng, sau khi do dự
  // 5: Đúng, dễ dàng
  @IsInt({ message: "Chất lượng ôn tập phải là số nguyên" })
  @IsIn([0, 1, 2, 3, 4, 5], { message: "Chất lượng ôn tập phải từ 0-5" })
  quality: number;
}
