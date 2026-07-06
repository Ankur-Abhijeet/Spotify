import {
  Controller,
  Get,
  Post,
  Patch,
  Put,
  Param,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';
import { PlaybackService } from './playback.service';
import { AuthGuard } from '../auth/auth.guard';

@Controller('playback')
export class PlaybackController {
  constructor(private readonly playbackService: PlaybackService) {}

  @Get('stream/:trackId')
  async getStream(@Param('trackId') trackId: string) {
    return this.playbackService.getStreamInfo(trackId);
  }

  @UseGuards(AuthGuard)
  @Get('session')
  async getSession(@Req() req: any) {
    return this.playbackService.getSession(req.user.sub);
  }

  @UseGuards(AuthGuard)
  @Post('session')
  async playTrack(@Req() req: any, @Body() body: { trackId: string }) {
    return this.playbackService.playTrack(req.user.sub, body.trackId);
  }

  @UseGuards(AuthGuard)
  @Patch('session/queue')
  async updateQueue(@Req() req: any, @Body() body: { trackIds: string[] }) {
    return this.playbackService.updateQueue(req.user.sub, body.trackIds);
  }

  @UseGuards(AuthGuard)
  @Put('session/position')
  async updatePosition(@Req() req: any, @Body() body: { position: number }) {
    return this.playbackService.updatePosition(req.user.sub, body.position);
  }
}
