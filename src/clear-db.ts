/**
 * Script xóa sạch DB, chỉ giữ lại collection users.
 * Chạy bằng:
 *   npx ts-node -r tsconfig-paths/register src/clear-db.ts
 */

import mongoose, { Schema } from "mongoose";

const MONGO_URI = process.env.MONGODB_URI ?? "mongodb://localhost:27017/ielts-writing-db";

const TopicModel        = mongoose.model("Topic",         new Schema({}, { strict: false }));
const CourseModel       = mongoose.model("Course",        new Schema({}, { strict: false }));
const LessonModel       = mongoose.model("Lesson",        new Schema({}, { strict: false }));
const ExamQuestionModel = mongoose.model("ExamQuestion",  new Schema({}, { strict: false }));
const SampleEssayModel  = mongoose.model("SampleEssay",   new Schema({}, { strict: false }));
const SubmissionModel   = mongoose.model("Submission",    new Schema({}, { strict: false }));
const FlashcardSetModel = mongoose.model("FlashcardSet",  new Schema({}, { strict: false }));
const FlashcardModel    = mongoose.model("Flashcard",     new Schema({}, { strict: false }));
const NoteCollectionModel = mongoose.model("NoteCollection", new Schema({}, { strict: false }));
const NotebookNoteModel = mongoose.model("NotebookNote",  new Schema({}, { strict: false }));
const FavoriteEssayModel = mongoose.model("FavoriteEssay", new Schema({}, { strict: false }));

async function clearDb() {
  await mongoose.connect(MONGO_URI);
  console.log("Connected to MongoDB:", MONGO_URI);

  const collections = [
    { model: TopicModel,          name: "topics"          },
    { model: CourseModel,         name: "courses"         },
    { model: LessonModel,         name: "lessons"         },
    { model: ExamQuestionModel,   name: "examquestions"   },
    { model: SampleEssayModel,    name: "sampleessays"    },
    { model: SubmissionModel,     name: "submissions"     },
    { model: FlashcardSetModel,   name: "flashcardsets"   },
    { model: FlashcardModel,      name: "flashcards"      },
    { model: NoteCollectionModel, name: "notecollections" },
    { model: NotebookNoteModel,   name: "notebooknotes"   },
    { model: FavoriteEssayModel,  name: "favoriteessays"  },
  ];

  for (const { model, name } of collections) {
    const result = await model.deleteMany({});
    console.log(`Cleared ${name}: ${result.deletedCount} documents`);
  }

  console.log("\nDone. Users collection was not touched.");
  await mongoose.disconnect();
}

clearDb().catch((err) => {
  console.error(err);
  process.exit(1);
});
