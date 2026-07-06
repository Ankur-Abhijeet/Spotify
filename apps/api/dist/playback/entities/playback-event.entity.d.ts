import { User } from '../../auth/entities/user.entity';
export declare class PlaybackEvent {
    id: string;
    userId: string;
    trackId: string;
    eventType: 'play' | 'skip' | 'save' | 'finish';
    timestamp: Date;
    metadata: Record<string, any>;
    user: User;
}
