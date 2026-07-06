import { Repository } from 'typeorm';
import { Follow } from './entities/follow.entity';
import { PlaybackEvent } from '../playback/entities/playback-event.entity';
import { CatalogService } from '../catalog/catalog.service';
import { LibraryService } from '../library/library.service';
export declare class SocialService {
    private readonly followRepository;
    private readonly playbackEventRepository;
    private readonly catalogService;
    private readonly libraryService;
    constructor(followRepository: Repository<Follow>, playbackEventRepository: Repository<PlaybackEvent>, catalogService: CatalogService, libraryService: LibraryService);
    followUser(followerId: string, followeeId: string): Promise<{
        status: string;
        followeeId?: undefined;
    } | {
        status: string;
        followeeId: string;
    }>;
    unfollowUser(followerId: string, followeeId: string): Promise<{
        status: string;
        followeeId: string;
    }>;
    getFollowing(followerId: string): Promise<Follow[]>;
    getFriendActivity(userId: string): Promise<{
        user: {
            id: string;
            email: string;
        };
        track: {
            id: string;
            title: string;
            artist: string | undefined;
            albumArt: string | undefined;
        };
        timestamp: Date;
    }[]>;
    generateBlend(userId: string, friendId: string): Promise<{
        status: string;
        playlistId: string;
        tracksCount: number;
    }>;
}
