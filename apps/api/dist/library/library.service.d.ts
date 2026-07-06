import { Repository } from 'typeorm';
import { Playlist } from './entities/playlist.entity';
import { PlaylistTrack } from './entities/playlist-track.entity';
import { LibraryItem } from './entities/library-item.entity';
import { CatalogService } from '../catalog/catalog.service';
export declare class LibraryService {
    private readonly playlistRepository;
    private readonly playlistTrackRepository;
    private readonly libraryItemRepository;
    private readonly catalogService;
    constructor(playlistRepository: Repository<Playlist>, playlistTrackRepository: Repository<PlaylistTrack>, libraryItemRepository: Repository<LibraryItem>, catalogService: CatalogService);
    getLibrary(userId: string): Promise<{
        playlists: Playlist[];
        likedTracks: import("../catalog/entities/track.entity").Track[];
        artistIds: string[];
    }>;
    likeTrack(userId: string, trackId: string): Promise<LibraryItem>;
    unlikeTrack(userId: string, trackId: string): Promise<{
        success: boolean;
    }>;
    followArtist(userId: string, artistId: string): Promise<LibraryItem>;
    unfollowArtist(userId: string, artistId: string): Promise<{
        success: boolean;
    }>;
    createPlaylist(userId: string, title: string, description?: string): Promise<Playlist>;
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
        playlistTracks: PlaylistTrack[];
        createdAt: Date;
        updatedAt: Date;
    }>;
    addTrackToPlaylist(userId: string, playlistId: string, trackId: string): Promise<{
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
        playlistTracks: PlaylistTrack[];
        createdAt: Date;
        updatedAt: Date;
    }>;
    removeTrackFromPlaylist(userId: string, playlistId: string, trackId: string): Promise<{
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
        playlistTracks: PlaylistTrack[];
        createdAt: Date;
        updatedAt: Date;
    }>;
    reorderPlaylistTracks(userId: string, playlistId: string, orderedTrackIds: string[]): Promise<{
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
        playlistTracks: PlaylistTrack[];
        createdAt: Date;
        updatedAt: Date;
    }>;
}
