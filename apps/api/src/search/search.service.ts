import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Playlist } from '../library/entities/playlist.entity';
import { CatalogService } from '../catalog/catalog.service';

@Injectable()
export class SearchService {
  constructor(
    @InjectRepository(Playlist)
    private readonly playlistRepository: Repository<Playlist>,
    private readonly catalogService: CatalogService,
  ) {}

  async search(query: string) {
    if (!query || query.trim() === '') {
      return { tracks: [], artists: [], albums: [], playlists: [] };
    }

    const cleanQuery = query.trim();

    try {
      const itunesRes = await fetch(
        `https://itunes.apple.com/search?term=${encodeURIComponent(cleanQuery)}&media=music&limit=15`,
      );

      let tracks = [];
      let artists = [];
      let albums = [];

      if (itunesRes.ok) {
        const data = await itunesRes.json();
        const results = data.results || [];
        
        const songResults = results.filter((item: any) => item.wrapperType === 'track');
        
        tracks = songResults.map((item: any) =>
          (this.catalogService as any).mapItunesTrack(item),
        );

        artists = results
          .filter((item: any) => item.artistName)
          .map((art: any) => ({
            id: art.artistId?.toString() || 'unknown-artist',
            name: art.artistName,
            imageUrl: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400',
            popularity: 80,
            bio: `Genre: ${art.primaryGenreName || 'Various'}`,
          }))
          .filter((val: any, index: number, self: any[]) => self.findIndex((a: any) => a.id === val.id) === index);

        albums = results
          .filter((item: any) => item.collectionName)
          .map((alb: any) => {
            const artworkUrl = alb.artworkUrl100
              ? alb.artworkUrl100.replace('100x100bb.jpg', '400x400bb.jpg')
              : 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=400';
            return {
              id: alb.collectionId?.toString() || 'unknown-album',
              title: alb.collectionName,
              artUrl: artworkUrl,
              releaseDate: alb.releaseDate ? alb.releaseDate.substring(0, 4) : '2026',
              artistId: alb.artistId?.toString() || 'unknown-artist',
              artist: {
                id: alb.artistId?.toString() || 'unknown-artist',
                name: alb.artistName,
              },
            };
          })
          .filter((val: any, index: number, self: any[]) => self.findIndex((a: any) => a.id === val.id) === index);
      }

      const playlists = await this.playlistRepository
        .createQueryBuilder('playlist')
        .where('playlist.title LIKE :query', { query: `%${cleanQuery}%` })
        .andWhere('playlist.isPublic = :isPublic', { isPublic: true })
        .take(10)
        .getMany();

      return { tracks, artists, albums, playlists };
    } catch (err) {
      console.error('Failed to proxy search query to iTunes:', err);
      return { tracks: [], artists: [], albums: [], playlists: [] };
    }
  }
}
