import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { NoteCollectionsController } from "./note-collections.controller";
import { NoteCollectionsService } from "./note-collections.service";
import { NoteCollection, NoteCollectionSchema } from "../schemas/note-collection.schema";
import { NotebookNote, NotebookNoteSchema } from "../schemas/notebook-note.schema";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: NoteCollection.name, schema: NoteCollectionSchema },
      { name: NotebookNote.name,   schema: NotebookNoteSchema   },
    ]),
  ],
  controllers: [NoteCollectionsController],
  providers:   [NoteCollectionsService],
})
export class NoteCollectionsModule {}
