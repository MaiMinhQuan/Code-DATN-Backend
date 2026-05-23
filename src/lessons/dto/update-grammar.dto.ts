// DTO body PATCH /lessons/:id/grammars/:index
import { PartialType } from "@nestjs/mapped-types";
import { AddGrammarDto } from "./add-grammar.dto";

export class UpdateGrammarDto extends PartialType(AddGrammarDto) {}
