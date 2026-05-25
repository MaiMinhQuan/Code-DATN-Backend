import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { FlashcardsController } from "./flashcards.controller";
import { FlashcardsService } from "./flashcards.service";
import { FlashcardSet, FlashcardSetSchema } from "../schemas/flashcard-set.schema";
import { Flashcard, FlashcardSchema } from "../schemas/flashcard.schema";
import { Lesson, LessonSchema } from "../schemas/lesson.schema";
import { Course, CourseSchema } from "../schemas/course.schema";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: FlashcardSet.name, schema: FlashcardSetSchema },
      { name: Flashcard.name,    schema: FlashcardSchema    },
      { name: Lesson.name,       schema: LessonSchema       },
      { name: Course.name,       schema: CourseSchema       },
    ]),
  ],
  controllers: [FlashcardsController],
  providers: [FlashcardsService],
  exports: [FlashcardsService],
})
export class FlashcardsModule {}
