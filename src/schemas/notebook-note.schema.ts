// Schema NotebookNote
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type NotebookNoteDocument = NotebookNote & Document;

@Schema({ timestamps: true })
export class NotebookNote {
  @Prop({ type: Types.ObjectId, ref: "User", required: true })
  userId: Types.ObjectId;

  @Prop({ required: true })
  userDraftNote: string;

  @Prop()
  title?: string;

  // Collection cha (null nếu không thuộc collection nào)
  @Prop({ type: Types.ObjectId, ref: "NoteCollection", default: null })
  collectionId: Types.ObjectId | null;
}

export const NotebookNoteSchema = SchemaFactory.createForClass(NotebookNote);

// Index phục vụ list note theo user, mới nhất trước
NotebookNoteSchema.index({ userId: 1, createdAt: -1 });
