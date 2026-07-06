import { Playlist } from './playlist.entity';
export declare class PlaylistTrack {
    playlistId: string;
    trackId: string;
    position: number;
    addedAt: Date;
    playlist: Playlist;
}
