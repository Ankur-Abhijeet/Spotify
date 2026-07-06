import { Repository } from 'typeorm';
import { Playlist } from '../library/entities/playlist.entity';
import { CatalogService } from '../catalog/catalog.service';
export declare class SearchService {
    private readonly playlistRepository;
    private readonly catalogService;
    constructor(playlistRepository: Repository<Playlist>, catalogService: CatalogService);
    search(query: string): Promise<{
        tracks: any;
        artists: any;
        albums: any;
        playlists: Playlist[];
    }>;
}
