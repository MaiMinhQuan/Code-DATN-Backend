// DTO body PATCH /lessons/:id/vocabularies/:index
import { PartialType } from "@nestjs/mapped-types";
import { AddVocabularyDto } from "./add-vocabulary.dto";

export class UpdateVocabularyDto extends PartialType(AddVocabularyDto) {}
