import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type ExamQuestionDocument = ExamQuestion & Document;

@Schema({ timestamps: true })
export class ExamQuestion {
  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ type: Types.ObjectId, ref: "Topic" })
  topicId?: Types.ObjectId;

  @Prop({ required: true })
  questionPrompt: string; // Đề bài IELTS Writing Task 2

  @Prop()
  suggestedOutline?: string; // Gợi ý dàn ý (markdown hoặc plain text)

  @Prop({ default: 0 })
  difficultyLevel: number; // 1-5 hoặc tùy chỉnh

  @Prop({ default: true })
  isPublished: boolean;

  @Prop({ default: 0 })
  attemptCount: number; // Số lượt làm bài

  @Prop()
  sourceReference?: string; // Nguồn đề thi (nếu có)

  @Prop({ type: [String], default: [] })
  tags: string[]; // Tags để phân loại thêm: "education", "technology", "environment"...
}

export const ExamQuestionSchema = SchemaFactory.createForClass(ExamQuestion);

// Indexes
ExamQuestionSchema.index({ topicId: 1 });
ExamQuestionSchema.index({ isPublished: 1 });
ExamQuestionSchema.index({ difficultyLevel: 1 });
ExamQuestionSchema.index({ tags: 1 });
