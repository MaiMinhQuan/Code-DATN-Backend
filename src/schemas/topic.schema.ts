// Schema Topic
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

export type TopicDocument = Topic & Document;

@Schema({ timestamps: true })
export class Topic {
  @Prop({ required: true, unique: true, trim: true })
  name: string;

  @Prop({ unique: true, trim: true })
  slug: string;

  @Prop({ trim: true })
  description?: string;

  @Prop()
  iconUrl?: string;

  @Prop({ default: 0 })
  orderIndex: number;

  @Prop({ default: true })
  isActive: boolean;
}

export const TopicSchema = SchemaFactory.createForClass(Topic);

// Index
TopicSchema.index({ orderIndex: 1 });

// Tự tạo slug khi name thay đổi
TopicSchema.pre("save", function (next) {
  if (this.isModified("name")) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }
  next();
});
