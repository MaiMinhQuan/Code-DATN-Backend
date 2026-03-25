import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type FlashcardSetDocument = FlashcardSet & Document;

@Schema({ timestamps: true })
export class FlashcardSet {
  @Prop({ type: Types.ObjectId, ref: "User", required: true })
  userId: Types.ObjectId;

  @Prop({ required: true, trim: true })
  title: string;

  @Prop()
  description?: string;
}

export const FlashcardSetSchema = SchemaFactory.createForClass(FlashcardSet);

// Indexes
FlashcardSetSchema.index({ userId: 1 });
