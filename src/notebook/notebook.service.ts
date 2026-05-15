// Service CRUD NotebookNote (check ownership theo user)
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

  /*
  Danh sách note của user (filter theo collectionId)
  Input:
    - userId — id user
    - collectionId — "none" | ObjectId | undefined
   */
  async findAll(userId: string, collectionId?: string): Promise<NotebookNote[]> {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException("userId không hợp lệ");
    }

    const filter: Record<string, unknown> = { userId: new Types.ObjectId(userId) };

    if (collectionId === "none") {
      // Chỉ lấy note chưa thuộc collection nào
      filter.collectionId = null;
    } else if (collectionId && Types.ObjectId.isValid(collectionId)) {
      filter.collectionId = new Types.ObjectId(collectionId);
    }

    return this.notebookNoteModel.find(filter).sort({ createdAt: -1 }).exec();
  }

  /*
  Chi tiết note (check ownership)
  Input:
    - id — id note
    - userId — id user
   */
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

  /*
  Tạo note mới
  Input:
    - userId — id user
    - createNoteDto — body request
   */
  async create(userId: string, createNoteDto: CreateNoteDto): Promise<NotebookNote> {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException("userId không hợp lệ");
    }

    const newNote = new this.notebookNoteModel({
      userId:        new Types.ObjectId(userId),
      userDraftNote: createNoteDto.userDraftNote,
      title:         createNoteDto.title || undefined,
      // Cast collectionId string → ObjectId, hoặc null nếu không có
      collectionId:  createNoteDto.collectionId
                       ? new Types.ObjectId(createNoteDto.collectionId)
                       : null,
    });

    return newNote.save();
  }

  /*
  Cập nhật note (owner-only), tự cast collectionId → ObjectId/null
  Input:
    - id — id note
    - userId — id user
    - updateNoteDto — body request
   */
  async update(id: string, userId: string, updateNoteDto: UpdateNoteDto): Promise<NotebookNote> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException("id không hợp lệ");
    }
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException("userId không hợp lệ");
    }

    // Tạo payload thủ công để cast collectionId đúng kiểu
    const updatePayload: Record<string, unknown> = {};
    if (updateNoteDto.userDraftNote !== undefined) updatePayload.userDraftNote = updateNoteDto.userDraftNote;
    if (updateNoteDto.title         !== undefined) updatePayload.title         = updateNoteDto.title;
    if (updateNoteDto.collectionId  !== undefined) {
      updatePayload.collectionId = updateNoteDto.collectionId
        ? new Types.ObjectId(updateNoteDto.collectionId)
        : null;
    }

    const updatedNote = await this.notebookNoteModel
      .findOneAndUpdate(
        {
          _id: new Types.ObjectId(id),
          userId: new Types.ObjectId(userId),
        },
        { $set: updatePayload },
        { new: true },
      )
      .exec();

    if (!updatedNote) {
      throw new NotFoundException(`Không tìm thấy ghi chú với ID: ${id}`);
    }

    return updatedNote;
  }

  /*
  Xóa note (owner-only)
  Input:
    - id — id note
    - userId — id user
   */
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
