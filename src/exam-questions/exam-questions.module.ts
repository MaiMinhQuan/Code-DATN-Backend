import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { ExamQuestionsController } from "./exam-questions.controller";
import { ExamQuestionsService } from "./exam-questions.service";
import { ExamQuestion, ExamQuestionSchema } from "../schemas/exam-question.schema";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ExamQuestion.name, schema: ExamQuestionSchema },
    ]),
  ],
  controllers: [ExamQuestionsController],
  providers: [ExamQuestionsService],
  exports: [ExamQuestionsService],
})
export class ExamQuestionsModule {}
