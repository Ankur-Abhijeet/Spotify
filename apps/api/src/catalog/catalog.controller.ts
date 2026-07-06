import { Controller, Get, Post, Param, Query, Body } from '@nestjs/common';
import { CatalogService } from './catalog.service';

@Controller('catalog')
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Post('seed')
  async seed() {
    return this.catalogService.seed();
  }

  @Get('spotify-token')
  async getSpotifyToken() {
    try {
      const token = await this.catalogService.getSpotifyAccessToken();
      return { token };
    } catch (err: any) {
      console.error('getSpotifyToken ERROR:', err.stack || err);
      throw err;
    }
  }

  @Get('tracks')
  async getTracks() {
    return this.catalogService.getTracks();
  }

  @Get('popular')
  async getPopular(@Query('limit') limit?: string) {
    const parsedLimit = limit ? parseInt(limit, 10) : 10;
    return this.catalogService.getPopularTracks(parsedLimit);
  }

  @Get('tracks/:id')
  async getTrack(@Param('id') id: string) {
    return this.catalogService.getTrack(id);
  }

  @Get('albums/:id')
  async getAlbum(@Param('id') id: string) {
    return this.catalogService.getAlbum(id);
  }

  @Get('artists/:id')
  async getArtist(@Param('id') id: string) {
    return this.catalogService.getArtist(id);
  }

  @Post('import-spotify')
  async importSpotify(@Body('playlistId') playlistId: string) {
    return this.catalogService.importSpotifyPlaylist(playlistId);
  }
}
