// Schema Flashcard
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type FlashcardDocument = Flashcard & Document;

@Schema({ timestamps: true })
export class Flashcard {
  @Prop({ type: Types.ObjectId, ref: "FlashcardSet", required: true })
  setId: Types.ObjectId;

  @Prop({ required: true })
  frontContent: string;

  @Prop({ required: true })
  backContent: string;

  @Prop({ default: 0 })
  reviewCount: number;
}

export const FlashcardSchema = SchemaFactory.createForClass(Flashcard);

FlashcardSchema.index({ setId: 1 });
