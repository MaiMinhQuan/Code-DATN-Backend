import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
} from "@nestjs/common";
import { FavoriteEssaysService } from "./favorite-essays.service";
import { AddFavoriteDto } from "./dto/add-favorite.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

@Controller("favorite-essays")
export class FavoriteEssaysController {
  constructor(private readonly favoriteEssaysService: FavoriteEssaysService) {}

  // GET /api/favorite-essays
  // Lấy danh sách bài mẫu yêu thích
  @UseGuards(JwtAuthGuard)
  @Get()
  async getFavorites(@Req() req) {
    const userId = req.user._id.toString();
    return this.favoriteEssaysService.getFavorites(userId);
  }

  // POST /api/favorite-essays
  // Thêm bài mẫu vào yêu thích
  @UseGuards(JwtAuthGuard)
  @Post()
  async addFavorite(@Req() req, @Body() addFavoriteDto: AddFavoriteDto) {
    const userId = req.user._id.toString();
    return this.favoriteEssaysService.addFavorite(
      userId,
      addFavoriteDto.essayId,
      addFavoriteDto.personalNote,
    );
  }

  // DELETE /api/favorite-essays/:essayId
  // Xóa bài mẫu khỏi yêu thích
  @UseGuards(JwtAuthGuard)
  @Delete(":essayId")
  async removeFavorite(@Req() req, @Param("essayId") essayId: string) {
    const userId = req.user._id.toString();
    return this.favoriteEssaysService.removeFavorite(userId, essayId);
  }

  // GET /api/favorite-essays/check/:essayId
  // Kiểm tra bài mẫu có trong yêu thích của user hay không
  @UseGuards(JwtAuthGuard)
  @Get("check/:essayId")
  async checkFavorite(@Req() req, @Param("essayId") essayId: string) {
    const userId = req.user._id.toString();
    const isFavorited = await this.favoriteEssaysService.isFavorite(userId, essayId);
    return { essayId, isFavorited };
  }
}
