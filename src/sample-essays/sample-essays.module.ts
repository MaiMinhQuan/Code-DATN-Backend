import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { SampleEssaysController } from "./sample-essays.controller";
import { SampleEssaysService } from "./sample-essays.service";
import { SampleEssay, SampleEssaySchema } from "../schemas/sample-essay.schema";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: SampleEssay.name, schema: SampleEssaySchema },
    ]),
  ],
  controllers: [SampleEssaysController],
  providers: [SampleEssaysService],
  exports: [SampleEssaysService],
})
export class SampleEssaysModule {}
