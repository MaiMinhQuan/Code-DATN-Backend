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

  /*
  Danh sách topic; mặc định chỉ topic đang active
  Input:
    - showAll — true thì gồm cả topic đã ẩn (admin)
   */
  async findAll(showAll: boolean = false) {
    const filter: any = {};

    if (!showAll) {
      filter.isActive = true;
    }

    const topics = await this.topicModel
      .find(filter)
      .sort({ orderIndex: 1, createdAt: -1 }) // orderIndex tăng dần, cùng order thì mới trước
      .exec();
    return topics;
  }

  /*
  Chi tiết một topic theo id hoặc slug
  Input:
    - identifier — id hoặc slug
   */
  async findOne(identifier: string) {
    let topic;

    if (identifier.match(/^[0-9a-fA-F]{24}$/)) {
      topic = await this.topicModel.findById(identifier).exec();
    }

    if (!topic) {
      topic = await this.topicModel.findOne({ slug: identifier}).exec();
    }

    if (!topic) {
      throw new NotFoundException("Không tìm thấy chủ đề");
    }

    return topic;
  }

  /*
  Tạo topic mới
  Input:
    - createTopicDto — body request
   */
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

  /*
  Cập nhật topic
  Input:
    - id — id topic
    - updateTopicDto — body request
   */
  async update(id: string, updateTopicDto: UpdateTopicDto) {
    const topic = await this.topicModel.findById(id).exec();
    if (!topic) {
      throw new NotFoundException("Không tìm thấy chủ đề");
    }

    if (updateTopicDto.name && updateTopicDto.name !== topic.name) {
      const existingTopic = await this.topicModel
        .findOne({ name: updateTopicDto.name })
        .exec();
      if (existingTopic) {
        throw new ConflictException("Đã tồn tại chủ đề có tên này");
      }
    }

    // Chỉ gán trường có trong body
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

  /*
  Ẩn topic
  Input:
    - id — id topic
   */
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
    };
  }

  /*
  Tìm topic đang active theo slug
  Input:
    - slug — slug của topic
   */
  async findBySlug(slug: string) {
    const topic = await this.topicModel.findOne({ slug, isActive: true}).exec();
    if (!topic) {
      throw new NotFoundException("Không tìm thấy chủ đề");
    }
    return topic;
  }
}
