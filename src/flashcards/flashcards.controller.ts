// REST /flashcard-sets — CRUD set/cards và ghi nhận lượt ôn tập.
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  Req,
} from "@nestjs/common";
import { FlashcardsService } from "./flashcards.service";
import { CreateFlashcardSetDto } from "./dto/create-flashcard-set.dto";
import { UpdateFlashcardSetDto } from "./dto/update-flashcard-set.dto";
import { CreateFlashcardDto } from "./dto/create-flashcard.dto";
import { UpdateFlashcardDto } from "./dto/update-flashcard.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { UserRole } from "../common/enums";

@Controller("flashcard-sets")
export class FlashcardsController {
  constructor(private readonly flashcardsService: FlashcardsService) {}

  /*
  GET /flashcard-sets — danh sách bộ thẻ của user
  Input:
    - req.user — user từ JWT
   */
  @UseGuards(JwtAuthGuard)
  @Get()
  async findAllSets(@Req() req) {
    const userId = req.user._id.toString();
    return this.flashcardsService.findAllSets(userId);
  }

  /*
  GET /flashcard-sets/by-lesson/:lessonId — set + cards theo lessonId
  Input:
    - req.user — user từ JWT
    - lessonId — id lesson trên URL
   */
  @UseGuards(JwtAuthGuard)
  @Get("by-lesson/:lessonId")
  async findSetByLesson(@Req() req, @Param("lessonId") lessonId: string) {
    const userId = req.user._id.toString();
    return this.flashcardsService.findSetWithCardsByLesson(lessonId, userId);
  }

  /*
  GET /flashcard-sets/admin/by-lesson/:lessonId — admin lấy set + cards (bypass published check)
  */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get("admin/by-lesson/:lessonId")
  async adminFindSetByLesson(@Param("lessonId") lessonId: string) {
    return this.flashcardsService.adminFindSetWithCardsByLesson(lessonId);
  }

  /*
  GET /flashcard-sets/:id — chi tiết set + cards
  Input:
    - req.user — user từ JWT
    - id — id set trên URL
   */
  @UseGuards(JwtAuthGuard)
  @Get(":id")
  async findSetWithCards(@Req() req, @Param("id") id: string) {
    const userId = req.user._id.toString();
    return this.flashcardsService.findSetWithCards(id, userId);
  }

  /*
  POST /flashcard-sets — tạo set mới
  Input:
    - req.user — user từ JWT
    - createSetDto — body request
   */
  @UseGuards(JwtAuthGuard)
  @Post()
  async createSet(@Req() req, @Body() createSetDto: CreateFlashcardSetDto) {
    const userId = req.user._id.toString();
    return this.flashcardsService.createSet(userId, createSetDto);
  }

  /*
  PATCH /flashcard-sets/:id — cập nhật set
  Input:
    - req.user — user từ JWT
    - id — id set trên URL
    - updateSetDto — body request
   */
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

  /*
  DELETE /flashcard-sets/:id — xóa set + cards
  Input:
    - req.user — user từ JWT
    - id — id set trên URL
   */
  @UseGuards(JwtAuthGuard)
  @Delete(":id")
  async deleteSet(@Req() req, @Param("id") id: string) {
    const userId = req.user._id.toString();
    return this.flashcardsService.deleteSet(id, userId);
  }

  /*
  POST /flashcard-sets/:id/cards — thêm card vào set
  Input:
    - req.user — user từ JWT
    - setId — id set trên URL
    - createCardDto — body request
   */
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

  /*
  PATCH /flashcard-sets/cards/:cardId — cập nhật card
  Input:
    - req.user — user từ JWT
    - cardId — id card trên URL
    - updateCardDto — body request
   */
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

  /*
  DELETE /flashcard-sets/cards/:cardId — xóa card
  Input:
    - req.user — user từ JWT
    - cardId — id card trên URL
   */
  @UseGuards(JwtAuthGuard)
  @Delete("cards/:cardId")
  async deleteCard(@Req() req, @Param("cardId") cardId: string) {
    const userId = req.user._id.toString();
    return this.flashcardsService.deleteCard(cardId, userId);
  }

  /*
  POST /flashcard-sets/:id/admin/cards — admin thêm card vào LESSON set (bypass type check)
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post(":id/admin/cards")
  async adminAddCard(@Param("id") setId: string, @Body() createCardDto: CreateFlashcardDto) {
    return this.flashcardsService.adminAddCard(setId, createCardDto);
  }

  /*
  PATCH /flashcard-sets/admin/cards/:cardId — admin cập nhật card bất kỳ
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Patch("admin/cards/:cardId")
  async adminUpdateCard(@Param("cardId") cardId: string, @Body() updateCardDto: UpdateFlashcardDto) {
    return this.flashcardsService.adminUpdateCard(cardId, updateCardDto);
  }

  /*
  DELETE /flashcard-sets/admin/cards/:cardId — admin xóa card bất kỳ
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Delete("admin/cards/:cardId")
  async adminDeleteCard(@Param("cardId") cardId: string) {
    return this.flashcardsService.adminDeleteCard(cardId);
  }

  /*
  PATCH /flashcard-sets/cards/:cardId/review — ghi nhận lượt ôn (tăng reviewCount)
  Input:
    - req.user — user từ JWT
    - cardId — id card trên URL
   */
  @UseGuards(JwtAuthGuard)
  @Patch("cards/:cardId/review")
  async updateReviewSchedule(@Req() req, @Param("cardId") cardId: string) {
    const userId = req.user._id.toString();
    return this.flashcardsService.updateReviewSchedule(cardId, userId);
  }
}
