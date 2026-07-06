import { SocialService } from './social.service';
export declare class SocialController {
    private readonly socialService;
    constructor(socialService: SocialService);
    followUser(req: any, followeeId: string): Promise<{
        status: string;
        followeeId?: undefined;
    } | {
        status: string;
        followeeId: string;
    }>;
    unfollowUser(req: any, followeeId: string): Promise<{
        status: string;
        followeeId: string;
    }>;
    getFollowing(req: any): Promise<import("./entities/follow.entity").Follow[]>;
    getFriendActivity(req: any): Promise<{
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
    generateBlend(req: any, friendId: string): Promise<{
        status: string;
        playlistId: string;
        tracksCount: number;
    }>;
}
