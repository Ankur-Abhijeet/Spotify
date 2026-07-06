import { PlaybackService } from './playback.service';
export declare class PlaybackController {
    private readonly playbackService;
    constructor(playbackService: PlaybackService);
    getStream(trackId: string): Promise<{
        trackId: string;
        audioUrl: string;
        title: string;
        artistName: string | undefined;
    }>;
    getSession(req: any): Promise<any>;
    playTrack(req: any, body: {
        trackId: string;
    }): Promise<any>;
    updateQueue(req: any, body: {
        trackIds: string[];
    }): Promise<any>;
    updatePosition(req: any, body: {
        position: number;
    }): Promise<any>;
}
