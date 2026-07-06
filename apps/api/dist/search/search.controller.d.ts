import { SearchService } from './search.service';
export declare class SearchController {
    private readonly searchService;
    constructor(searchService: SearchService);
    search(query?: string): Promise<{
        tracks: any;
        artists: any;
        albums: any;
        playlists: import("../library/entities/playlist.entity").Playlist[];
    }>;
}
