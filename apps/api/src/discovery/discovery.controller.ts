import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { DiscoveryService } from './discovery.service';
import { AuthGuard } from '../auth/auth.guard';

@UseGuards(AuthGuard)
@Controller('discovery')
export class DiscoveryController {
  constructor(private readonly discoveryService: DiscoveryService) {}

  @Get('should-prompt')
  async shouldPrompt(
    @Req() req: any,
    @Query('sessionId') sessionId: string,
    @Query('isPrivateSession') isPrivateSession?: string,
    @Query('isQueuedAlbum') isQueuedAlbum?: string,
  ) {
    return this.discoveryService.shouldPrompt(req.user.sub, sessionId, {
      isPrivateSession: isPrivateSession === 'true',
      isQueuedAlbum: isQueuedAlbum === 'true',
    });
  }

  @Get('pair')
  async getPair(@Req() req: any) {
    return this.discoveryService.getCandidatesPair(req.user.sub);
  }

  @Post('choice')
  async recordChoice(
    @Req() req: any,
    @Body()
    body: {
      sessionId: string;
      promptId: string;
      candidateAId: string;
      candidateBId: string;
      chosenTrackId?: string;
      latencyMs?: number;
      previewBehavior?: Record<string, any>;
    },
  ) {
    return this.discoveryService.recordChoice(
      req.user.sub,
      body.sessionId,
      body.promptId,
      body.candidateAId,
      body.candidateBId,
      body.chosenTrackId,
      body.latencyMs,
      body.previewBehavior,
    );
  }

  @Post('mixes/generate')
  async generateMixes(@Req() req: any) {
    return this.discoveryService.generateDailyMixes(req.user.sub);
  }

  @Get('recap')
  async getRecap(@Req() req: any) {
    return this.discoveryService.getDiscoveryRecap(req.user.sub);
  }
}
