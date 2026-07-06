import { Repository } from 'typeorm';
import { DiscoveryEvent } from './entities/discovery-event.entity';
import { UserEmbedding } from './entities/user-embedding.entity';
import { TrackFeature } from './entities/track-feature.entity';
import { CatalogService } from '../catalog/catalog.service';
import { CohortHelper } from './cohort.helper';
import { Playlist } from '../library/entities/playlist.entity';
import { PlaylistTrack } from '../library/entities/playlist-track.entity';
export declare class DiscoveryService {
    private readonly eventRepository;
    private readonly embeddingRepository;
    private readonly featureRepository;
    private readonly playlistRepository;
    private readonly playlistTrackRepository;
    private readonly catalogService;
    private readonly cohortHelper;
    private readonly logger;
    private readonly redisClient;
    private readonly memoryStore;
    private readonly RECO_URL;
    private cbState;
    private cbFailureCount;
    private cbLastFailureTime;
    private readonly CB_FAILURE_THRESHOLD;
    private readonly CB_COOLDOWN_MS;
    constructor(eventRepository: Repository<DiscoveryEvent>, embeddingRepository: Repository<UserEmbedding>, featureRepository: Repository<TrackFeature>, playlistRepository: Repository<Playlist>, playlistTrackRepository: Repository<PlaylistTrack>, catalogService: CatalogService, cohortHelper: CohortHelper);
    shouldPrompt(userId: string, sessionId: string, context?: Record<string, any>): Promise<{
        prompt: boolean;
        reason: string;
    }>;
    getCandidatesPair(userId: string): Promise<{
        candidateA: import("../catalog/entities/track.entity").Track;
        candidateB: import("../catalog/entities/track.entity").Track;
        source: string;
    }>;
    private getHeuristicFallbackPair;
    recordChoice(userId: string, sessionId: string, promptId: string, candidateAId: string, candidateBId: string, chosenTrackId?: string, latencyMs?: number, previewBehavior?: Record<string, any>): Promise<any>;
    generateDailyMixes(userId: string): Promise<{
        status: string;
        mixes?: undefined;
    } | {
        status: string;
        mixes: {
            id: string;
            title: string;
            count: number;
        }[];
    }>;
    getDiscoveryRecap(userId: string): Promise<{
        totalPrompts: number;
        totalChoices: number;
        totalSkips: number;
        choiceRate: number;
        avgLatencyMs: number;
        topArtists: {
            name: string;
            count: number;
        }[];
    }>;
}
