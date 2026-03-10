import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type CourseDocument = Course & Document;

@Schema({ timestamps: true })
export class Course {
  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ type: String, trim: true })
  description?: string;

  @Prop({ type: Types.ObjectId, ref: 'Topic', required: true })
  topicId: Types.ObjectId;

  @Prop()
  thumbnailUrl?: string;

  @Prop({ default: 0 })
  orderIndex: number;

  @Prop({ default: true })
  isPublished: boolean;

  @Prop({ default: 0 })
  totalLessons: number;

  @Prop()
  instructorName?: string;

  @Prop({ default: true })
  isActive: boolean;
}

export const CourseSchema = SchemaFactory.createForClass(Course);

// Indexes
CourseSchema.index({ topicId: 1, isActive: 1 });
CourseSchema.index({ isPublished: 1, isActive: 1, orderIndex: 1 });
CourseSchema.index({ isActive: 1 });
