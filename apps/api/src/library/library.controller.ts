import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Param,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';
import { LibraryService } from './library.service';
import { AuthGuard } from '../auth/auth.guard';

@UseGuards(AuthGuard)
@Controller('library')
export class LibraryController {
  constructor(private readonly libraryService: LibraryService) {}

  @Get()
  async getLibrary(@Req() req: any) {
    return this.libraryService.getLibrary(req.user.sub);
  }

  @Post('like/:trackId')
  async likeTrack(@Req() req: any, @Param('trackId') trackId: string) {
    return this.libraryService.likeTrack(req.user.sub, trackId);
  }

  @Delete('like/:trackId')
  async unlikeTrack(@Req() req: any, @Param('trackId') trackId: string) {
    return this.libraryService.unlikeTrack(req.user.sub, trackId);
  }

  @Post('follow/artist/:artistId')
  async followArtist(@Req() req: any, @Param('artistId') artistId: string) {
    return this.libraryService.followArtist(req.user.sub, artistId);
  }

  @Delete('follow/artist/:artistId')
  async unfollowArtist(@Req() req: any, @Param('artistId') artistId: string) {
    return this.libraryService.unfollowArtist(req.user.sub, artistId);
  }

  @Post('playlists')
  async createPlaylist(
    @Req() req: any,
    @Body() body: { title: string; description?: string },
  ) {
    return this.libraryService.createPlaylist(
      req.user.sub,
      body.title,
      body.description,
    );
  }

  @Get('playlists/:id')
  async getPlaylist(@Param('id') id: string) {
    return this.libraryService.getPlaylist(id);
  }

  @Post('playlists/:id/tracks')
  async addTrack(
    @Req() req: any,
    @Param('id') playlistId: string,
    @Body() body: { trackId: string },
  ) {
    return this.libraryService.addTrackToPlaylist(
      req.user.sub,
      playlistId,
      body.trackId,
    );
  }

  @Delete('playlists/:id/tracks/:trackId')
  async removeTrack(
    @Req() req: any,
    @Param('id') playlistId: string,
    @Param('trackId') trackId: string,
  ) {
    return this.libraryService.removeTrackFromPlaylist(
      req.user.sub,
      playlistId,
      trackId,
    );
  }

  @Patch('playlists/:id/tracks/reorder')
  async reorderTracks(
    @Req() req: any,
    @Param('id') playlistId: string,
    @Body() body: { orderedTrackIds: string[] },
  ) {
    return this.libraryService.reorderPlaylistTracks(
      req.user.sub,
      playlistId,
      body.orderedTrackIds,
    );
  }
}
