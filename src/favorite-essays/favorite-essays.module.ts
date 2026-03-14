import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { FavoriteEssaysController } from "./favorite-essays.controller";
import { FavoriteEssaysService } from "./favorite-essays.service";
import { FavoriteEssay, FavoriteEssaySchema } from "../schemas/favorite-essay.schema";
import { SampleEssay, SampleEssaySchema } from "../schemas/sample-essay.schema";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: FavoriteEssay.name, schema: FavoriteEssaySchema },
      { name: SampleEssay.name, schema: SampleEssaySchema },
    ]),
  ],
  controllers: [FavoriteEssaysController],
  providers: [FavoriteEssaysService],
  exports: [FavoriteEssaysService],
})
export class FavoriteEssaysModule {}
