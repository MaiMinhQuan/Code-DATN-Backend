import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { NoteCollection, NoteCollectionDocument } from "../schemas/note-collection.schema";
import { NotebookNote, NotebookNoteDocument } from "../schemas/notebook-note.schema";
import { CreateCollectionDto } from "./dto/create-collection.dto";
import { UpdateCollectionDto } from "./dto/update-collection.dto";

@Injectable()
export class NoteCollectionsService {
  constructor(
    @InjectModel(NoteCollection.name) private collectionModel: Model<NoteCollectionDocument>,
    @InjectModel(NotebookNote.name)   private noteModel:       Model<NotebookNoteDocument>,
  ) {}

  async findAll(userId: string): Promise<NoteCollection[]> {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException("userId không hợp lệ");
    }
    return this.collectionModel
      .find({ userId: new Types.ObjectId(userId) })
      .sort({ createdAt: -1 })
      .exec();
  }

  async create(userId: string, dto: CreateCollectionDto): Promise<NoteCollection> {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException("userId không hợp lệ");
    }
    const created = new this.collectionModel({
      userId: new Types.ObjectId(userId),
      name:   dto.name,
      color:  dto.color,
    });
    return created.save();
  }

  async update(id: string, userId: string, dto: UpdateCollectionDto): Promise<NoteCollection> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException("id không hợp lệ");
    }
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException("userId không hợp lệ");
    }
    const updated = await this.collectionModel
      .findOneAndUpdate(
        { _id: new Types.ObjectId(id), userId: new Types.ObjectId(userId) },
        { $set: dto },
        { new: true },
      )
      .exec();
    if (!updated) {
      throw new NotFoundException(`Không tìm thấy bộ sưu tập với ID: ${id}`);
    }
    return updated;
  }

  async delete(id: string, userId: string): Promise<{ message: string }> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException("id không hợp lệ");
    }
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException("userId không hợp lệ");
    }
    const collection = await this.collectionModel
      .findOne({ _id: new Types.ObjectId(id), userId: new Types.ObjectId(userId) })
      .exec();
    if (!collection) {
      throw new NotFoundException(`Không tìm thấy bộ sưu tập với ID: ${id}`);
    }
    // Chuyển tất cả notes thuộc bộ này về null trước khi xóa
    await this.noteModel.updateMany(
      { collectionId: new Types.ObjectId(id) },
      { $set: { collectionId: null } },
    );
    await this.collectionModel.deleteOne({ _id: new Types.ObjectId(id) });
    return { message: "Đã xóa bộ sưu tập thành công" };
  }
}
