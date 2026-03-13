import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

// Sub-schema cho Topic Info (Nested Object)
class TopicInfo {
  @Prop({ type: Types.ObjectId, required: true })
  _id: Types.ObjectId;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  slug: string;
}

export type CourseDocument = Course & Document;

@Schema({ timestamps: true })
export class Course {
  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ type: String, trim: true })
  description?: string;

  @Prop({ required: true, type: Object })
  topicId: TopicInfo;

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
CourseSchema.index({ 'topicId._id': 1, isActive: 1 });
CourseSchema.index({ isPublished: 1, isActive: 1, orderIndex: 1 });
CourseSchema.index({ isActive: 1 });
