// Schema SampleEssay: bài mẫu + highlight annotation (embed).
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";
import { HighlightType } from "@/common/enums";

@Schema({ _id: false })
export class HighlightAnnotation {
  @Prop({ required: true })
  text: string;

  @Prop({ type: String, enum: HighlightType, required: true })
  highlightType: HighlightType;

  @Prop({ required: true })
  explanation: string;

  @Prop()
  color?: string;
}

export type SampleEssayDocument = SampleEssay & Document;

@Schema({ timestamps: true })
export class SampleEssay {
  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ type: Types.ObjectId, ref: "Topic", required: true })
  topicId: Types.ObjectId;

  @Prop({ required: true })
  questionPrompt: string;

  @Prop({ required: true })
  outlineContent: string;

  @Prop({ required: true })
  fullEssayContent: string;

  @Prop({ type: [HighlightAnnotation], default: [] })
  highlightAnnotations: HighlightAnnotation[];

  @Prop({ default: 0 })
  favoriteCount: number;

  @Prop({ default: true })
  isPublished: boolean;

  @Prop()
  authorName?: string;

  @Prop({ type: Number, required: true, min: 0, max: 9 })
  overallBandScore: number;
}

export const SampleEssaySchema = SchemaFactory.createForClass(SampleEssay);

// Index phục vụ filter/sort
SampleEssaySchema.index({ topicId: 1 });
SampleEssaySchema.index({ overallBandScore: 1 });
SampleEssaySchema.index({ isPublished: 1 });
SampleEssaySchema.index({ favoriteCount: -1 }); // descending for popularity sorting
