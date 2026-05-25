// Schema FlashcardSet
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";
import { FlashcardSetType } from "@/common/enums";

export type FlashcardSetDocument = FlashcardSet & Document;

@Schema({ timestamps: true })
export class FlashcardSet {
  // PERSONAL: học viên tạo, chỉ owner xem/sửa được
  // LESSON: gắn với lesson trong course, read-only, hiển thị khi lesson+course published
  @Prop({ type: String, enum: FlashcardSetType, default: FlashcardSetType.PERSONAL })
  type: FlashcardSetType;

  // Chỉ có với type PERSONAL
  @Prop({ type: Types.ObjectId, ref: "User" })
  userId?: Types.ObjectId;

  // Chỉ có với type LESSON
  @Prop({ type: Types.ObjectId, ref: "Lesson" })
  lessonId?: Types.ObjectId;

  @Prop({ required: true, trim: true })
  title: string;

  @Prop()
  description?: string;
}

export const FlashcardSetSchema = SchemaFactory.createForClass(FlashcardSet);

FlashcardSetSchema.index({ type: 1 });
FlashcardSetSchema.index({ userId: 1 });
FlashcardSetSchema.index({ lessonId: 1 });
