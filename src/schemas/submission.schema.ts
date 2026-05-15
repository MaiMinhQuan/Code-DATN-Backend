// Schema Submission: bài nộp của user + kết quả chấm AI (embed).
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";
import { SubmissionStatus, ErrorCategory } from "@/common/enums";

@Schema({ _id: false })
export class AIError {
  @Prop({ required: true })
  startIndex: number;

  @Prop({ required: true })
  endIndex: number;

  @Prop({ type: String, enum: ErrorCategory, required: true })
  category: ErrorCategory;

  @Prop({ required: true })
  originalText: string;

  @Prop({ required: true })
  suggestion: string;

  @Prop({ required: true })
  explanation: string;

  // Mức độ lỗi: low | medium | high
  @Prop({ default: "medium" })
  severity?: string;
}

@Schema({ _id: false, suppressReservedKeysWarning: true })
export class AIResult {
  @Prop({ type: Number, required: true, min: 0, max: 9 })
  taskResponseScore: number;

  @Prop({ type: Number, required: true, min: 0, max: 9 })
  coherenceScore: number;

  @Prop({ type: Number, required: true, min: 0, max: 9 })
  lexicalScore: number;

  @Prop({ type: Number, required: true, min: 0, max: 9 })
  grammarScore: number;

  @Prop({ type: Number, required: true, min: 0, max: 9 })
  overallBand: number;

  @Prop({ type: [AIError], default: [] })
  errors: AIError[];

  @Prop()
  generalFeedback?: string;

  @Prop()
  strengths?: string;

  @Prop()
  improvements?: string;

  @Prop()
  processedAt?: Date;
}

export type SubmissionDocument = Submission & Document;

@Schema({ timestamps: true })
export class Submission {
  @Prop({ type: Types.ObjectId, ref: "User", required: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "ExamQuestion", required: true })
  questionId: Types.ObjectId;

  @Prop({ required: true })
  essayContent: string;

  @Prop()
  wordCount?: number;

  @Prop()
  timeSpentSeconds?: number;

  @Prop({ type: String, enum: SubmissionStatus, default: SubmissionStatus.DRAFT })
  status: SubmissionStatus;

  @Prop({ type: AIResult })
  aiResult?: AIResult;

  @Prop()
  errorMessage?: string;

  @Prop()
  submittedAt?: Date;

  @Prop({ default: 1 })
  attemptNumber: number;
}

export const SubmissionSchema = SchemaFactory.createForClass(Submission);

// Index
SubmissionSchema.index({ userId: 1, createdAt: -1 });
SubmissionSchema.index({ questionId: 1 });
SubmissionSchema.index({ status: 1 });
SubmissionSchema.index({ userId: 1, questionId: 1, attemptNumber: 1 });

// Tự tính wordCount khi essayContent thay đổi
SubmissionSchema.pre("save", function (next) {
  if (this.isModified("essayContent")) {
    this.wordCount = this.essayContent.trim().split(/\s+/).length;
  }
  next();
});
