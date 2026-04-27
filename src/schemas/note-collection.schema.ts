import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

@Schema({ timestamps: true })
export class NoteCollection {
  @Prop({ type: Types.ObjectId, ref: "User", required: true })
  userId: Types.ObjectId

  @Prop({ required: true, trim: true })
  name: string

  @Prop({ default: "#6366f1" })
  color: string   // hex color cho dot hiển thị ở UI
}

export type NoteCollectionDocument = NoteCollection & Document
export const NoteCollectionSchema = SchemaFactory.createForClass(NoteCollection)
NoteCollectionSchema.index({ userId: 1 })
