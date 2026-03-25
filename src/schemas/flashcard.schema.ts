import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type FlashcardDocument = Flashcard & Document;

@Schema({ timestamps: true })
export class Flashcard {
  @Prop({ type: Types.ObjectId, ref: "FlashcardSet", required: true })
  setId: Types.ObjectId;

  @Prop({ required: true })
  frontContent: string; // Mặt trước (thường là từ vựng hoặc câu hỏi)

  @Prop({ required: true })
  backContent: string; // Mặt sau (nghĩa, giải thích)

  @Prop()
  nextReviewDate?: Date; // Ngày ôn tập tiếp theo (spaced repetition)

  @Prop({ default: 0 })
  reviewCount: number; // Số lần đã ôn tập
}

export const FlashcardSchema = SchemaFactory.createForClass(Flashcard);

// Indexes
FlashcardSchema.index({ setId: 1 });
FlashcardSchema.index({ nextReviewDate: 1 });
