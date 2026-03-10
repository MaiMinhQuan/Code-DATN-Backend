import { Injectable, NotFoundException, ConflictException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { Topic } from "@/schemas/topic.schema";
import { CreateTopicDto } from "./dto/create-topic.dto";
import { UpdateTopicDto } from "./dto/update-topic.dto";

@Injectable()
export class TopicsService {
  constructor(
    @InjectModel(Topic.name) private topicModel: Model<Topic>,
  ) {}

  // Lấy danh sách tất cả topic
  // Mặc định lấy topic active (isActive = true)
  // Admin có thể xem cả topics inactive bằng query ?showAll=true
  async findAll(showAll: boolean = false) {
    const filter: any = {}

    if (!showAll) {
      filter.isActive = true;
    }

    const topics = await this.topicModel
                            .find(filter)
                            .sort({ orderIndex: 1, createdAt: -1 }) // Sắp xếp theo orderIndex, sau đó createdAt
                            .exec();
    return topics;
  }

  // Xem chi tiết 1 topic
  // Có thể tìm theo _id hoặc slug
  async findOne(identifier: string) {
    let topic;

    // Thử tìm theo _id trước
    if (identifier.match(/^[0-9a-fA-F]{24}$/)) {
      topic = await this.topicModel.findById(identifier).exec();
    }

    // Nếu không tìm thấy, thử tìm theo slug
    if (!topic) {
      topic = await this.topicModel.findOne({ slug: identifier}).exec();
    }

    if (!topic) {
      throw new NotFoundException("Không tìm thấy chủ đề")
    }

    return topic;
  }

  // Tạo topic mới (chỉ cho admin)
  async create(createTopicDto: CreateTopicDto) {
    const { name, description, iconUrl, orderIndex } = createTopicDto;

    const existingTopic = await this.topicModel.findOne({ name }).exec();
    if (existingTopic) {
      throw new ConflictException("Đã tồn tại chủ đề có tên này");
    }

    const newTopic = new this.topicModel({
      name,
      description,
      iconUrl,
      orderIndex: orderIndex ?? 0,
      isActive: true,
    });

    await newTopic.save();
    return newTopic;
  }

  // Cập nhật topic (chỉ cho admin)
  async update(id: string, updateTopicDto: UpdateTopicDto) {
    const topic = await this.topicModel.findById(id).exec();
    if (!topic) {
      throw new NotFoundException("Không tìm thấy chủ đề");
    }

    // Nếu update name, kiểm tra trùng
    if (updateTopicDto.name && updateTopicDto.name !== topic.name) {
      const existingTopic = await this.topicModel
                                    .findOne({ name: updateTopicDto.name })
                                    .exec();
      if (existingTopic) {
        throw new ConflictException("Đã tồn tại chủ đề có tên này");
      }
    }

    // Update các trường
    if (updateTopicDto.name !== undefined) {
      topic.name = updateTopicDto.name;
    }
    if (updateTopicDto.description !== undefined) {
      topic.description = updateTopicDto.description;
    }
    if (updateTopicDto.iconUrl !== undefined) {
      topic.iconUrl = updateTopicDto.iconUrl;
    }
    if (updateTopicDto.orderIndex !== undefined) {
      topic.orderIndex = updateTopicDto.orderIndex;
    }
    if (updateTopicDto.isActive !== undefined) {
      topic.isActive = updateTopicDto.isActive;
    }

    await topic.save();
    return topic;
  }

  // Xóa topic (chỉ cho admin)
  async remove(id: string) {
    const topic = await this.topicModel.findById(id).exec();
    if (!topic) {
      throw new NotFoundException("Không tìm thấy chủ đề");
    }

    topic.isActive = false;
    await topic.save();

    return {
      message: "Đã ẩn chủ đề thành công",
      topicId: topic._id,
    }
  }

  // Lấy topic theo slug
  // Dùng cho việc filter courses, essays theo topic
  async findBySlug(slug: string) {
    const topic = await this.topicModel.findOne({ slug, isActive: true}).exec();
    if (!topic) {
      throw new NotFoundException("Không tìm thấy chủ đề");
    }
    return topic;
  }
}
