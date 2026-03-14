import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { FlashcardsController } from "./flashcards.controller";
import { FlashcardsService } from "./flashcards.service";
import { FlashcardSet, FlashcardSetSchema } from "../schemas/flashcard-set.schema";
import { Flashcard, FlashcardSchema } from "../schemas/flashcard.schema";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: FlashcardSet.name, schema: FlashcardSetSchema },
      { name: Flashcard.name, schema: FlashcardSchema },
    ]),
  ],
  controllers: [FlashcardsController],
  providers: [FlashcardsService],
  exports: [FlashcardsService],
})
export class FlashcardsModule {}
