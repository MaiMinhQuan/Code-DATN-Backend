// Đăng ký tất cả schema Mongoose để inject model qua @InjectModel
import { MongooseModule } from "@nestjs/mongoose";

import { User, UserSchema } from "@/schemas/user.schema";
import { Topic, TopicSchema } from "@/schemas/topic.schema";
import { Course, CourseSchema } from "@/schemas/course.schema";
import { Lesson, LessonSchema } from "@/schemas/lesson.schema";
import { SampleEssay, SampleEssaySchema } from "@/schemas/sample-essay.schema";
import { FavoriteEssay, FavoriteEssaySchema } from "@/schemas/favorite-essay.schema";
import { NotebookNote, NotebookNoteSchema } from "@/schemas/notebook-note.schema";
import { FlashcardSet, FlashcardSetSchema } from "@/schemas/flashcard-set.schema";
import { Flashcard, FlashcardSchema } from "@/schemas/flashcard.schema";
import { ExamQuestion, ExamQuestionSchema } from "@/schemas/exam-question.schema";
import { Submission, SubmissionSchema } from "@/schemas/submission.schema";

export const databaseProviders = [
  MongooseModule.forFeature([
    { name: User.name, schema: UserSchema },
    { name: Topic.name, schema: TopicSchema },
    { name: Course.name, schema: CourseSchema },
    { name: Lesson.name, schema: LessonSchema },
    { name: SampleEssay.name, schema: SampleEssaySchema },
    { name: FavoriteEssay.name, schema: FavoriteEssaySchema },
    { name: NotebookNote.name, schema: NotebookNoteSchema },
    { name: FlashcardSet.name, schema: FlashcardSetSchema },
    { name: Flashcard.name, schema: FlashcardSchema },
    { name: ExamQuestion.name, schema: ExamQuestionSchema },
    { name: Submission.name, schema: SubmissionSchema },
  ]),
];
