import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { SocialService } from './social.service';
import { AuthGuard } from '../auth/auth.guard';

@UseGuards(AuthGuard)
@Controller('social')
export class SocialController {
  constructor(private readonly socialService: SocialService) {}

  @Post('follow')
  async followUser(@Req() req: any, @Body('followeeId') followeeId: string) {
    return this.socialService.followUser(req.user.sub, followeeId);
  }

  @Delete('unfollow')
  async unfollowUser(@Req() req: any, @Body('followeeId') followeeId: string) {
    return this.socialService.unfollowUser(req.user.sub, followeeId);
  }

  @Get('following')
  async getFollowing(@Req() req: any) {
    return this.socialService.getFollowing(req.user.sub);
  }

  @Get('friend-activity')
  async getFriendActivity(@Req() req: any) {
    return this.socialService.getFriendActivity(req.user.sub);
  }

  @Post('blend/generate')
  async generateBlend(@Req() req: any, @Body('friendId') friendId: string) {
    return this.socialService.generateBlend(req.user.sub, friendId);
  }
}
