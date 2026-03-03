import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { SubmissionStatus, ErrorCategory } from '@/common/enums';

// Embedded Sub-document for AI Error Detection
@Schema({ _id: false })
export class AIError {
  @Prop({ required: true })
  startIndex: number;

  @Prop({ required: true })
  endIndex: number;

  @Prop({ type: String, enum: ErrorCategory, required: true })
  category: ErrorCategory;

  @Prop({ required: true })
  originalText: string; // Đoạn text bị lỗi

  @Prop({ required: true })
  suggestion: string; // Gợi ý sửa

  @Prop({ required: true })
  explanation: string; // Giải thích lỗi (tiếng Việt)

  @Prop({ default: 'medium' })
  severity?: string; // "low", "medium", "high"
}

// Embedded AI Result Document
@Schema({ _id: false })
export class AIResult {
  @Prop({ type: Number, required: true, min: 0, max: 9 })
  taskResponseScore: number; // Điểm Task Response (0-9)

  @Prop({ type: Number, required: true, min: 0, max: 9 })
  coherenceScore: number; // Điểm Coherence & Cohesion (0-9)

  @Prop({ type: Number, required: true, min: 0, max: 9 })
  lexicalScore: number; // Điểm Lexical Resource (0-9)

  @Prop({ type: Number, required: true, min: 0, max: 9 })
  grammarScore: number; // Điểm Grammatical Range & Accuracy (0-9)

  @Prop({ type: Number, required: true, min: 0, max: 9 })
  overallBand: number; // Điểm tổng (trung bình)

  @Prop({ type: [AIError], default: [] })
  errors: AIError[]; // Danh sách lỗi phát hiện

  @Prop()
  generalFeedback?: string; // Nhận xét chung từ AI (tiếng Việt)

  @Prop()
  strengths?: string; // Điểm mạnh

  @Prop()
  improvements?: string; // Điểm cần cải thiện

  @Prop()
  processedAt?: Date; // Thời điểm AI chấm xong
}

// Main Submission Schema
export type SubmissionDocument = Submission & Document;

@Schema({ timestamps: true })
export class Submission {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'ExamQuestion', required: true })
  questionId: Types.ObjectId;

  @Prop({ required: true })
  essayContent: string; // Nội dung bài viết của học viên

  @Prop()
  wordCount?: number; // Số từ trong bài viết

  @Prop()
  timeSpentSeconds?: number; // Thời gian làm bài (giây)

  @Prop({ type: String, enum: SubmissionStatus, default: SubmissionStatus.DRAFT })
  status: SubmissionStatus;

  @Prop({ type: AIResult })
  aiResult?: AIResult; // Kết quả chấm từ AI (chỉ có khi status = COMPLETED)

  @Prop()
  errorMessage?: string; // Lưu lỗi nếu status = FAILED

  @Prop()
  submittedAt?: Date; // Thời điểm nộp bài

  @Prop({ default: 1 })
  attemptNumber: number; // Lần làm thứ mấy (nếu làm lại cùng 1 đề)
}

export const SubmissionSchema = SchemaFactory.createForClass(Submission);

// Indexes
SubmissionSchema.index({ userId: 1, createdAt: -1 });
SubmissionSchema.index({ questionId: 1 });
SubmissionSchema.index({ status: 1 });
SubmissionSchema.index({ userId: 1, questionId: 1, attemptNumber: 1 });

// Pre-save hook to calculate word count
SubmissionSchema.pre('save', function (next) {
  if (this.isModified('essayContent')) {
    this.wordCount = this.essayContent.trim().split(/\s+/).length;
  }
  next();
});
