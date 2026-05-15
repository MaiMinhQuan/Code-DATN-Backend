// Schema FavoriteEssay
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type FavoriteEssayDocument = FavoriteEssay & Document;

@Schema({ timestamps: true })
export class FavoriteEssay {
  @Prop({ type: Types.ObjectId, ref: "User", required: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "SampleEssay", required: true })
  essayId: Types.ObjectId;

  @Prop()
  personalNote?: string;
}

export const FavoriteEssaySchema = SchemaFactory.createForClass(FavoriteEssay);

// Index
FavoriteEssaySchema.index({ userId: 1, essayId: 1 }, { unique: true });
FavoriteEssaySchema.index({ userId: 1 });
