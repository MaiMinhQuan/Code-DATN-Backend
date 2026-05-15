// Schema NoteCollection
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

@Schema({ timestamps: true })
export class NoteCollection {
  @Prop({ type: Types.ObjectId, ref: "User", required: true })
  userId: Types.ObjectId;

  @Prop({ required: true, trim: true })
  name: string;

  // Màu hex hiển thị UI
  @Prop({ default: "#6366f1" })
  color: string;
}

export type NoteCollectionDocument = NoteCollection & Document;
export const NoteCollectionSchema = SchemaFactory.createForClass(NoteCollection);

// Index
NoteCollectionSchema.index({ userId: 1 });
