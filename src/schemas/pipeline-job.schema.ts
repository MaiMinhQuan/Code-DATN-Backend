import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

export type PipelineJobDocument = PipelineJob & Document;

export type PipelineJobStatus =
  | "pending"
  | "running"
  | "waiting_review"
  | "analyzing"
  | "ready_to_seed"
  | "seeding"
  | "done"
  | "failed";

@Schema({ timestamps: true })
export class PipelineJob {
  @Prop({ required: true, trim: true })
  topic: string;

  @Prop({ default: 8 })
  maxVideos: number;

  @Prop({ default: 8 })
  maxEssays: number;

  @Prop({
    default: "pending",
    enum: ["pending", "running", "waiting_review", "analyzing", "ready_to_seed", "seeding", "done", "failed"],
  })
  status: PipelineJobStatus;

  @Prop({ default: 0 })
  currentStep: number;

  @Prop({ type: [String], default: [] })
  logs: string[];
}

export const PipelineJobSchema = SchemaFactory.createForClass(PipelineJob);
