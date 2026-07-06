import { User } from '../../auth/entities/user.entity';
import { PlaylistTrack } from './playlist-track.entity';
export declare class Playlist {
    id: string;
    title: string;
    description: string;
    coverUrl: string;
    isPublic: boolean;
    isCollaborative: boolean;
    ownerId: string;
    owner: User;
    playlistTracks: PlaylistTrack[];
    createdAt: Date;
    updatedAt: Date;
}
