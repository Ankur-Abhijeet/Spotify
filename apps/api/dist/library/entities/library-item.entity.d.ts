import { User } from '../../auth/entities/user.entity';
export declare class LibraryItem {
    id: string;
    userId: string;
    itemType: 'track' | 'album' | 'artist';
    itemId: string;
    savedAt: Date;
    user: User;
}
