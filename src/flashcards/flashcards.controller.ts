import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
} from "@nestjs/common";
import { FlashcardsService } from "./flashcards.service";
import { CreateFlashcardSetDto } from "./dto/create-flashcard-set.dto";
import { UpdateFlashcardSetDto } from "./dto/update-flashcard-set.dto";
import { CreateFlashcardDto } from "./dto/create-flashcard.dto";
import { UpdateFlashcardDto } from "./dto/update-flashcard.dto";
import { UpdateReviewDto } from "./dto/update-review.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

@Controller("flashcard-sets")
export class FlashcardsController {
  constructor(private readonly flashcardsService: FlashcardsService) {}

  // ==================== FLASHCARD SET ENDPOINTS ====================

  // GET /api/flashcard-sets
  // Lấy tất cả bộ thẻ của user
  @UseGuards(JwtAuthGuard)
  @Get()
  async findAllSets(@Req() req) {
    const userId = req.user._id.toString();
    return this.flashcardsService.findAllSets(userId);
  }

  // GET /api/flashcard-sets/review
  // Lấy các thẻ cần ôn tập hôm nay
  @UseGuards(JwtAuthGuard)
  @Get("review")
  async getCardsForReview(@Req() req) {
    const userId = req.user._id.toString();
    return this.flashcardsService.getCardsForReview(userId);
  }

  // GET /api/flashcard-sets/:id
  // Lấy chi tiết bộ thẻ + cards
  @UseGuards(JwtAuthGuard)
  @Get(":id")
  async findSetWithCards(@Req() req, @Param("id") id: string) {
    const userId = req.user._id.toString();
    return this.flashcardsService.findSetWithCards(id, userId);
  }

  // POST /api/flashcard-sets
  // Tạo bộ thẻ mới
  @UseGuards(JwtAuthGuard)
  @Post()
  async createSet(@Req() req, @Body() createSetDto: CreateFlashcardSetDto) {
    const userId = req.user._id.toString();
    return this.flashcardsService.createSet(userId, createSetDto);
  }

  // PATCH /api/flashcard-sets/:id
  // Cập nhật bộ thẻ
  @UseGuards(JwtAuthGuard)
  @Patch(":id")
  async updateSet(
    @Req() req,
    @Param("id") id: string,
    @Body() updateSetDto: UpdateFlashcardSetDto,
  ) {
    const userId = req.user._id.toString();
    return this.flashcardsService.updateSet(id, userId, updateSetDto);
  }

  // DELETE /api/flashcard-sets/:id
  // Xóa bộ thẻ (và tất cả cards bên trong)
  @UseGuards(JwtAuthGuard)
  @Delete(":id")
  async deleteSet(@Req() req, @Param("id") id: string) {
    const userId = req.user._id.toString();
    return this.flashcardsService.deleteSet(id, userId);
  }

  // ==================== FLASHCARD (CARD) ENDPOINTS ====================

  // POST /api/flashcard-sets/:id/cards
  // Thêm card vào bộ thẻ
  @UseGuards(JwtAuthGuard)
  @Post(":id/cards")
  async addCard(
    @Req() req,
    @Param("id") setId: string,
    @Body() createCardDto: CreateFlashcardDto,
  ) {
    const userId = req.user._id.toString();
    return this.flashcardsService.addCard(setId, userId, createCardDto);
  }

  // PATCH /api/flashcard-sets/cards/:cardId
  // Cập nhật card
  @UseGuards(JwtAuthGuard)
  @Patch("cards/:cardId")
  async updateCard(
    @Req() req,
    @Param("cardId") cardId: string,
    @Body() updateCardDto: UpdateFlashcardDto,
  ) {
    const userId = req.user._id.toString();
    return this.flashcardsService.updateCard(cardId, userId, updateCardDto);
  }

  // DELETE /api/flashcard-sets/cards/:cardId
  // Xóa card
  @UseGuards(JwtAuthGuard)
  @Delete("cards/:cardId")
  async deleteCard(@Req() req, @Param("cardId") cardId: string) {
    const userId = req.user._id.toString();
    return this.flashcardsService.deleteCard(cardId, userId);
  }

  // PATCH /api/flashcard-sets/cards/:cardId/review
  // Cập nhật lịch ôn tập (Spaced Repetition)
  @UseGuards(JwtAuthGuard)
  @Patch("cards/:cardId/review")
  async updateReviewSchedule(
    @Req() req,
    @Param("cardId") cardId: string,
    @Body() updateReviewDto: UpdateReviewDto,
  ) {
    const userId = req.user._id.toString();
    return this.flashcardsService.updateReviewSchedule(cardId, userId, updateReviewDto);
  }
}
