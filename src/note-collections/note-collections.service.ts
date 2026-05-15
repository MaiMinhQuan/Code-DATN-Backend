// Service CRUD note collection; khi xóa collection thì detach note (không cascade-delete).
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

  /*
  Danh sách collection của user (mới nhất trước)
  Input:
    - userId — id user
   */
  async findAll(userId: string): Promise<NoteCollection[]> {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException("userId không hợp lệ");
    }
    return this.collectionModel
      .find({ userId: new Types.ObjectId(userId) })
      .sort({ createdAt: -1 })
      .exec();
  }

  /*
  Tạo collection mới
  Input:
    - userId — id user
    - dto — body request
   */
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

  /*
  Cập nhật collection (owner-only)
  Input:
    - id — id collection
    - userId — id user
    - dto — body request
   */
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

  /*
  Xóa collection và detach toàn bộ note (collectionId=null)
  Input:
    - id — id collection
    - userId — id user
   */
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

    // Detach notes trước khi xóa collection để không mất dữ liệu note
    await this.noteModel.updateMany(
      { collectionId: new Types.ObjectId(id) },
      { $set: { collectionId: null } },
    );
    await this.collectionModel.deleteOne({ _id: new Types.ObjectId(id) });
    return { message: "Đã xóa bộ sưu tập thành công" };
  }
}
