import { Track } from './entities/track.entity';
import { Album } from './entities/album.entity';
import { Artist } from './entities/artist.entity';
export declare class CatalogService {
    private readonly logger;
    getSpotifyAccessToken(): Promise<string>;
    private mapItunesTrack;
    mapSpotifyTrack(t: any): Track;
    seed(): Promise<{
        status: string;
        message: string;
    }>;
    getTracks(): Promise<Track[]>;
    getPopularTracks(limit?: number): Promise<Track[]>;
    getTrack(id: string): Promise<Track>;
    getAlbum(id: string): Promise<Album>;
    getArtist(id: string): Promise<Artist>;
    getTracksByIds(ids: string[]): Promise<Track[]>;
    importSpotifyPlaylist(playlistId: string): Promise<{
        status: string;
        tracks: Track[];
        message: string;
    }>;
}
