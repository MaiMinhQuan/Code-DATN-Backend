import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { TargetBand } from '@/common/enums';

// Embedded Sub-documents
@Schema({ _id: false })
export class LessonVideo {
  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  videoUrl: string;

  @Prop()
  duration?: number; // in seconds

  @Prop()
  thumbnailUrl?: string;
}

@Schema({ _id: false })
export class LessonVocabulary {
  @Prop({ required: true })
  word: string;

  @Prop()
  pronunciation?: string;

  @Prop()
  definition: string;

  @Prop({ type: [String], default: [] })
  examples: string[];

  @Prop()
  translation?: string; // Vietnamese translation
}

@Schema({ _id: false })
export class LessonGrammar {
  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  explanation: string;

  @Prop({ type: [String], default: [] })
  examples: string[];

  @Prop()
  structure?: string; // e.g., "Subject + Verb + Object"
}

// Main Lesson Schema
export type LessonDocument = Lesson & Document;

@Schema({ timestamps: true })
export class Lesson {
  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ type: Types.ObjectId, ref: 'Course', required: true })
  courseId: Types.ObjectId;

  @Prop({ type: String, enum: TargetBand, required: true })
  targetBand: TargetBand;

  @Prop({ type: String, trim: true })
  description?: string;

  @Prop({ default: 0 })
  orderIndex: number;

  @Prop({ default: true })
  isPublished: boolean;

  // Embedded arrays
  @Prop({ type: [LessonVideo], default: [] })
  videos: LessonVideo[];

  @Prop({ type: [LessonVocabulary], default: [] })
  vocabularies: LessonVocabulary[];

  @Prop({ type: [LessonGrammar], default: [] })
  grammars: LessonGrammar[];

  @Prop()
  notesContent?: string; // Rich text or Markdown for additional lesson notes
}

export const LessonSchema = SchemaFactory.createForClass(Lesson);

// Indexes
LessonSchema.index({ courseId: 1, orderIndex: 1 });
LessonSchema.index({ targetBand: 1 });
LessonSchema.index({ isPublished: 1 });
