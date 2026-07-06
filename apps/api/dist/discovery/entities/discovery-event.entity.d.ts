import { User } from '../../auth/entities/user.entity';
export declare class DiscoveryEvent {
    id: string;
    userId: string;
    sessionId: string;
    timestamp: Date;
    context: Record<string, any>;
    candidateAId: string;
    candidateBId: string;
    chosenTrackId: string;
    rejectedTrackId: string;
    latencyMs: number;
    previewBehavior: Record<string, any>;
    downstreamEngagement: Record<string, any>;
    user: User;
}
