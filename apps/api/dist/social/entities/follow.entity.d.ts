import { User } from '../../auth/entities/user.entity';
export declare class Follow {
    id: string;
    followerId: string;
    followeeId: string;
    createdAt: Date;
    follower: User;
    followee: User;
}
