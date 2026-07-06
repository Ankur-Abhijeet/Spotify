import { DiscoveryService } from './discovery.service';
export declare class DiscoveryController {
    private readonly discoveryService;
    constructor(discoveryService: DiscoveryService);
    shouldPrompt(req: any, sessionId: string, isPrivateSession?: string, isQueuedAlbum?: string): Promise<{
        prompt: boolean;
        reason: string;
    }>;
    getPair(req: any): Promise<{
        candidateA: import("../catalog/entities/track.entity").Track;
        candidateB: import("../catalog/entities/track.entity").Track;
        source: string;
    }>;
    recordChoice(req: any, body: {
        sessionId: string;
        promptId: string;
        candidateAId: string;
        candidateBId: string;
        chosenTrackId?: string;
        latencyMs?: number;
        previewBehavior?: Record<string, any>;
    }): Promise<any>;
    generateMixes(req: any): Promise<{
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
    getRecap(req: any): Promise<{
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
