import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { NotebookController } from "./notebook.controller";
import { NotebookService } from "./notebook.service";
import { NotebookNote, NotebookNoteSchema } from "../schemas/notebook-note.schema";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: NotebookNote.name, schema: NotebookNoteSchema },
    ]),
  ],
  controllers: [NotebookController],
  providers: [NotebookService],
  exports: [NotebookService],
})
export class NotebookModule {}
