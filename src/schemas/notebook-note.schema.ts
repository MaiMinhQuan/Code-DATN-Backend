import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type NotebookNoteDocument = NotebookNote & Document;

@Schema({ timestamps: true })
export class NotebookNote {
  @Prop({ type: Types.ObjectId, ref: "User", required: true })
  userId: Types.ObjectId;

  @Prop({ required: true })
  userDraftNote: string; // Nội dung ghi chú tự do (có thể là plain text hoặc markdown)

  @Prop()
  title?: string; // Tiêu đề tùy chọn cho ghi chú
}

export const NotebookNoteSchema = SchemaFactory.createForClass(NotebookNote);

// Indexes
NotebookNoteSchema.index({ userId: 1, createdAt: -1 });
