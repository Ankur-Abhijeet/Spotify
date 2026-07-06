import { CatalogService } from './catalog.service';
export declare class CatalogController {
    private readonly catalogService;
    constructor(catalogService: CatalogService);
    seed(): Promise<{
        status: string;
        message: string;
    }>;
    getSpotifyToken(): Promise<{
        token: string;
    }>;
    getTracks(): Promise<import("./entities/track.entity").Track[]>;
    getPopular(limit?: string): Promise<import("./entities/track.entity").Track[]>;
    getTrack(id: string): Promise<import("./entities/track.entity").Track>;
    getAlbum(id: string): Promise<import("./entities/album.entity").Album>;
    getArtist(id: string): Promise<import("./entities/artist.entity").Artist>;
    importSpotify(playlistId: string): Promise<{
        status: string;
        tracks: import("./entities/track.entity").Track[];
        message: string;
    }>;
}
