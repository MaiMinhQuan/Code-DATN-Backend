// Schema ExamQuestion
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
  questionPrompt: string;

  @Prop()
  suggestedOutline?: string;

  @Prop({ default: 0 })
  difficultyLevel: number;

  @Prop({ default: true })
  isPublished: boolean;

  @Prop({ default: 0 })
  attemptCount: number;

  @Prop()
  sourceReference?: string;

  @Prop({ type: [String], default: [] })
  tags: string[];
}

export const ExamQuestionSchema = SchemaFactory.createForClass(ExamQuestion);

// Index
ExamQuestionSchema.index({ topicId: 1 });
ExamQuestionSchema.index({ isPublished: 1 });
ExamQuestionSchema.index({ difficultyLevel: 1 });
ExamQuestionSchema.index({ tags: 1 });
