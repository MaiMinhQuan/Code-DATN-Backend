import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";
import { TargetBand, HighlightType } from "@/common/enums";

// Embedded Sub-document for Highlight Annotations
@Schema({ _id: false })
export class HighlightAnnotation {
  @Prop({ required: true })
  startIndex: number;

  @Prop({ required: true })
  endIndex: number;

  @Prop({ type: String, enum: HighlightType, required: true })
  highlightType: HighlightType;

  @Prop({ required: true })
  explanation: string; // Giải thích bằng tiếng Việt hoặc tiếng Anh

  @Prop()
  color?: string; // Hex color code for UI customization
}

// Main SampleEssay Schema
export type SampleEssayDocument = SampleEssay & Document;

@Schema({ timestamps: true })
export class SampleEssay {
  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ type: Types.ObjectId, ref: "Topic", required: true })
  topicId: Types.ObjectId;

  @Prop({ required: true })
  questionPrompt: string; // Đề bài

  @Prop({ type: String, enum: TargetBand, required: true })
  targetBand: TargetBand;

  @Prop({ required: true })
  outlineContent: string; // Dàn ý (có thể là markdown hoặc plain text)

  @Prop({ required: true })
  fullEssayContent: string; // Bài viết mẫu hoàn chỉnh

  @Prop({ type: [HighlightAnnotation], default: [] })
  highlightAnnotations: HighlightAnnotation[];

  @Prop({ default: 0 })
  viewCount: number;

  @Prop({ default: 0 })
  favoriteCount: number;

  @Prop({ default: true })
  isPublished: boolean;

  @Prop()
  authorName?: string;

  @Prop({ type: Number, min: 0, max: 9 })
  overallBandScore?: number; // e.g., 7.5
}

export const SampleEssaySchema = SchemaFactory.createForClass(SampleEssay);

// Indexes
SampleEssaySchema.index({ topicId: 1 });
SampleEssaySchema.index({ targetBand: 1 });
SampleEssaySchema.index({ isPublished: 1 });
SampleEssaySchema.index({ favoriteCount: -1 }); // For sorting by popularity
