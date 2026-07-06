import { LibraryService } from './library.service';
export declare class LibraryController {
    private readonly libraryService;
    constructor(libraryService: LibraryService);
    getLibrary(req: any): Promise<{
        playlists: import("./entities/playlist.entity").Playlist[];
        likedTracks: import("../catalog/entities/track.entity").Track[];
        artistIds: string[];
    }>;
    likeTrack(req: any, trackId: string): Promise<import("./entities/library-item.entity").LibraryItem>;
    unlikeTrack(req: any, trackId: string): Promise<{
        success: boolean;
    }>;
    followArtist(req: any, artistId: string): Promise<import("./entities/library-item.entity").LibraryItem>;
    unfollowArtist(req: any, artistId: string): Promise<{
        success: boolean;
    }>;
    createPlaylist(req: any, body: {
        title: string;
        description?: string;
    }): Promise<import("./entities/playlist.entity").Playlist>;
    getPlaylist(id: string): Promise<{
        tracks: {
            addedAt: Date;
            position: number;
            id: string;
            title: string;
            duration: number;
            audioUrl: string;
            popularity?: number;
            streamable?: boolean;
            artistId?: string;
            albumId?: string;
            artist?: import("../catalog/entities/artist.entity").Artist;
            album?: import("../catalog/entities/album.entity").Album;
        }[];
        id: string;
        title: string;
        description: string;
        coverUrl: string;
        isPublic: boolean;
        isCollaborative: boolean;
        ownerId: string;
        owner: import("../auth/entities/user.entity").User;
        playlistTracks: import("./entities/playlist-track.entity").PlaylistTrack[];
        createdAt: Date;
        updatedAt: Date;
    }>;
    addTrack(req: any, playlistId: string, body: {
        trackId: string;
    }): Promise<{
        tracks: {
            addedAt: Date;
            position: number;
            id: string;
            title: string;
            duration: number;
            audioUrl: string;
            popularity?: number;
            streamable?: boolean;
            artistId?: string;
            albumId?: string;
            artist?: import("../catalog/entities/artist.entity").Artist;
            album?: import("../catalog/entities/album.entity").Album;
        }[];
        id: string;
        title: string;
        description: string;
        coverUrl: string;
        isPublic: boolean;
        isCollaborative: boolean;
        ownerId: string;
        owner: import("../auth/entities/user.entity").User;
        playlistTracks: import("./entities/playlist-track.entity").PlaylistTrack[];
        createdAt: Date;
        updatedAt: Date;
    }>;
    removeTrack(req: any, playlistId: string, trackId: string): Promise<{
        tracks: {
            addedAt: Date;
            position: number;
            id: string;
            title: string;
            duration: number;
            audioUrl: string;
            popularity?: number;
            streamable?: boolean;
            artistId?: string;
            albumId?: string;
            artist?: import("../catalog/entities/artist.entity").Artist;
            album?: import("../catalog/entities/album.entity").Album;
        }[];
        id: string;
        title: string;
        description: string;
        coverUrl: string;
        isPublic: boolean;
        isCollaborative: boolean;
        ownerId: string;
        owner: import("../auth/entities/user.entity").User;
        playlistTracks: import("./entities/playlist-track.entity").PlaylistTrack[];
        createdAt: Date;
        updatedAt: Date;
    }>;
    reorderTracks(req: any, playlistId: string, body: {
        orderedTrackIds: string[];
    }): Promise<{
        tracks: {
            addedAt: Date;
            position: number;
            id: string;
            title: string;
            duration: number;
            audioUrl: string;
            popularity?: number;
            streamable?: boolean;
            artistId?: string;
            albumId?: string;
            artist?: import("../catalog/entities/artist.entity").Artist;
            album?: import("../catalog/entities/album.entity").Album;
        }[];
        id: string;
        title: string;
        description: string;
        coverUrl: string;
        isPublic: boolean;
        isCollaborative: boolean;
        ownerId: string;
        owner: import("../auth/entities/user.entity").User;
        playlistTracks: import("./entities/playlist-track.entity").PlaylistTrack[];
        createdAt: Date;
        updatedAt: Date;
    }>;
}
