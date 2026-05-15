// REST /favorite-essays — thêm/xóa/check/list bài mẫu yêu thích theo user.
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

  /*
  GET /favorite-essays — danh sách bài mẫu yêu thích của user
  Input:
    - req.user — user từ JWT
   */
  @UseGuards(JwtAuthGuard)
  @Get()
  async getFavorites(@Req() req) {
    const userId = req.user._id.toString();
    return this.favoriteEssaysService.getFavorites(userId);
  }

  /*
  POST /favorite-essays — thêm vào yêu thích (tăng favoriteCount)
  Input:
    - req.user — user từ JWT
    - addFavoriteDto — body request
   */
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

  /*
  DELETE /favorite-essays/:essayId — xóa khỏi yêu thích (giảm favoriteCount)
  Input:
    - req.user — user từ JWT
    - essayId — id essay trên URL
   */
  @UseGuards(JwtAuthGuard)
  @Delete(":essayId")
  async removeFavorite(@Req() req, @Param("essayId") essayId: string) {
    const userId = req.user._id.toString();
    return this.favoriteEssaysService.removeFavorite(userId, essayId);
  }

  /*
  GET /favorite-essays/check/:essayId — check đã favorite chưa
  Input:
    - req.user — user từ JWT
    - essayId — id essay trên URL
   */
  @UseGuards(JwtAuthGuard)
  @Get("check/:essayId")
  async checkFavorite(@Req() req, @Param("essayId") essayId: string) {
    const userId = req.user._id.toString();
    const isFavorited = await this.favoriteEssaysService.isFavorite(userId, essayId);
    return { essayId, isFavorited };
  }
}
