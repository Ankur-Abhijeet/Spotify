import { CatalogService } from '../catalog/catalog.service';
export declare class PlaybackService {
    private readonly catalogService;
    private readonly logger;
    private readonly redisClient;
    private readonly memoryStore;
    constructor(catalogService: CatalogService);
    getStreamInfo(trackId: string): Promise<{
        trackId: string;
        audioUrl: string;
        title: string;
        artistName: string | undefined;
    }>;
    getSession(userId: string): Promise<any>;
    saveSession(userId: string, sessionState: any): Promise<any>;
    updateQueue(userId: string, trackIds: string[]): Promise<any>;
    playTrack(userId: string, trackId: string): Promise<any>;
    updatePosition(userId: string, position: number): Promise<any>;
}
