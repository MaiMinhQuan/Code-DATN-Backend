import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { NotebookNote, NotebookNoteDocument } from "../schemas/notebook-note.schema";
import { CreateNoteDto } from "./dto/create-note.dto";
import { UpdateNoteDto } from "./dto/update-note.dto";

@Injectable()
export class NotebookService {
  constructor(
    @InjectModel(NotebookNote.name) private notebookNoteModel: Model<NotebookNoteDocument>,
  ) {}

  // Lấy tất cả ghi chú của user
  // userId: ID của user
  async findAll(userId: string): Promise<NotebookNote[]> {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException("userId không hợp lệ");
    }

    return this.notebookNoteModel
      .find({ userId: new Types.ObjectId(userId) })
      .sort({ createdAt: -1 })
      .exec();
  }

  // Lấy chi tiết 1 ghi chú
  // id: ID của ghi chú
  // userId: ID của user
  async findOne(id: string, userId: string): Promise<NotebookNote> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException("id không hợp lệ");
    }
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException("userId không hợp lệ");
    }

    const note = await this.notebookNoteModel
      .findOne({
        _id: new Types.ObjectId(id),
        userId: new Types.ObjectId(userId),
      })
      .exec();

    if (!note) {
      throw new NotFoundException(`Không tìm thấy ghi chú với ID: ${id}`);
    }

    return note;
  }

  // Tạo ghi chú mới
  // userId: ID của user
  // createNoteDto: Dữ liệu ghi chú mới (chứa userDraftNote và title)
  async create(userId: string, createNoteDto: CreateNoteDto): Promise<NotebookNote> {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException("userId không hợp lệ");
    }

    const newNote = new this.notebookNoteModel({
      userId: new Types.ObjectId(userId),
      userDraftNote: createNoteDto.userDraftNote,
      title: createNoteDto.title || undefined,
    });

    return newNote.save();
  }

  // Cập nhật ghi chú
  // id: ID của ghi chú
  // userId: ID của user
  // updateNoteDto: Dữ liệu cập nhật cho ghi chú
  async update(id: string, userId: string, updateNoteDto: UpdateNoteDto): Promise<NotebookNote> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException("id không hợp lệ");
    }
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException("userId không hợp lệ");
    }

    const updatedNote = await this.notebookNoteModel
      .findOneAndUpdate(
        {
          _id: new Types.ObjectId(id),
          userId: new Types.ObjectId(userId),
        },
        { $set: updateNoteDto },
        { new: true },
      )
      .exec();

    if (!updatedNote) {
      throw new NotFoundException(`Không tìm thấy ghi chú với ID: ${id}`);
    }

    return updatedNote;
  }

  // Xóa ghi chú
  // id: ID của ghi chú
  // userId: ID của user
  async delete(id: string, userId: string): Promise<{ message: string }> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException("id không hợp lệ");
    }
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException("userId không hợp lệ");
    }

    const result = await this.notebookNoteModel
      .findOneAndDelete({
        _id: new Types.ObjectId(id),
        userId: new Types.ObjectId(userId),
      })
      .exec();

    if (!result) {
      throw new NotFoundException(`Không tìm thấy ghi chú với ID: ${id}`);
    }

    return { message: "Đã xóa ghi chú thành công" };
  }
}
