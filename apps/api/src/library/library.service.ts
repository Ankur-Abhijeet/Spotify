import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Playlist } from './entities/playlist.entity';
import { PlaylistTrack } from './entities/playlist-track.entity';
import { LibraryItem } from './entities/library-item.entity';
import { CatalogService } from '../catalog/catalog.service';

@Injectable()
export class LibraryService {
  constructor(
    @InjectRepository(Playlist)
    private readonly playlistRepository: Repository<Playlist>,
    @InjectRepository(PlaylistTrack)
    private readonly playlistTrackRepository: Repository<PlaylistTrack>,
    @InjectRepository(LibraryItem)
    private readonly libraryItemRepository: Repository<LibraryItem>,
    private readonly catalogService: CatalogService,
  ) {}

  async getLibrary(userId: string) {
    const items = await this.libraryItemRepository.find({
      where: { userId },
      order: { savedAt: 'DESC' },
    });

    const playlists = await this.playlistRepository.find({
      where: { ownerId: userId },
      order: { updatedAt: 'DESC' },
    });

    const trackIds = items
      .filter((i) => i.itemType === 'track')
      .map((i) => i.itemId);
    const artistIds = items
      .filter((i) => i.itemType === 'artist')
      .map((i) => i.itemId);

    // Fetch related details dynamically from Spotify Web API proxy
    const likedTracks = trackIds.length
      ? await this.catalogService.getTracksByIds(trackIds)
      : [];

    return {
      playlists,
      likedTracks,
      artistIds,
    };
  }

  async likeTrack(userId: string, trackId: string) {
    // Verify track exists on Spotify on-the-fly
    try {
      await this.catalogService.getTrack(trackId);
    } catch (e) {
      throw new NotFoundException('Track not found on Spotify');
    }

    const existing = await this.libraryItemRepository.findOne({
      where: { userId, itemType: 'track', itemId: trackId },
    });
    if (existing) {
      return existing; // idempotent
    }

    const item = this.libraryItemRepository.create({
      userId,
      itemType: 'track',
      itemId: trackId,
    });
    return this.libraryItemRepository.save(item);
  }

  async unlikeTrack(userId: string, trackId: string) {
    const existing = await this.libraryItemRepository.findOne({
      where: { userId, itemType: 'track', itemId: trackId },
    });
    if (!existing) {
      throw new NotFoundException('Track not liked');
    }
    await this.libraryItemRepository.remove(existing);
    return { success: true };
  }

  async followArtist(userId: string, artistId: string) {
    const existing = await this.libraryItemRepository.findOne({
      where: { userId, itemType: 'artist', itemId: artistId },
    });
    if (existing) {
      return existing;
    }
    const item = this.libraryItemRepository.create({
      userId,
      itemType: 'artist',
      itemId: artistId,
    });
    return this.libraryItemRepository.save(item);
  }

  async unfollowArtist(userId: string, artistId: string) {
    const existing = await this.libraryItemRepository.findOne({
      where: { userId, itemType: 'artist', itemId: artistId },
    });
    if (!existing) {
      throw new NotFoundException('Artist not followed');
    }
    await this.libraryItemRepository.remove(existing);
    return { success: true };
  }

  async createPlaylist(userId: string, title: string, description?: string) {
    const playlist = this.playlistRepository.create({
      ownerId: userId,
      title,
      description,
    });
    return this.playlistRepository.save(playlist);
  }

  async getPlaylist(id: string) {
    const playlist = await this.playlistRepository.findOne({
      where: { id },
      relations: { owner: true },
    });
    if (!playlist) {
      throw new NotFoundException('Playlist not found');
    }

    const playlistTracks = await this.playlistTrackRepository.find({
      where: { playlistId: id },
      order: { position: 'ASC' },
    });

    const playlistTrackIds = playlistTracks.map((pt) => pt.trackId);
    const trackDetails = await this.catalogService.getTracksByIds(playlistTrackIds);

    // Map details back to order
    const mappedTracks = playlistTracks.map((pt) => {
      const trackObj = trackDetails.find((t) => t.id === pt.trackId);
      return {
        ...(trackObj || {
          id: pt.trackId,
          title: 'Unknown Track',
          duration: 0,
          audioUrl: '',
        }),
        addedAt: pt.addedAt,
        position: pt.position,
      };
    });

    return {
      ...playlist,
      tracks: mappedTracks,
    };
  }

  async addTrackToPlaylist(
    userId: string,
    playlistId: string,
    trackId: string,
  ) {
    const playlist = await this.playlistRepository.findOne({
      where: { id: playlistId },
    });
    if (!playlist) {
      throw new NotFoundException('Playlist not found');
    }

    if (playlist.ownerId !== userId && !playlist.isCollaborative) {
      throw new ForbiddenException(
        'You do not have permission to edit this playlist',
      );
    }

    // Verify track exists on Spotify on-the-fly
    try {
      await this.catalogService.getTrack(trackId);
    } catch (e) {
      throw new NotFoundException('Track not found on Spotify');
    }

    // Find next position
    const currentTracks = await this.playlistTrackRepository.find({
      where: { playlistId },
    });
    const nextPosition =
      currentTracks.length > 0
        ? Math.max(...currentTracks.map((t) => t.position)) + 1
        : 0;

    const playlistTrack = this.playlistTrackRepository.create({
      playlistId,
      trackId,
      position: nextPosition,
    });

    await this.playlistTrackRepository.save(playlistTrack);

    // Update playlist updatedAt
    playlist.updatedAt = new Date();
    await this.playlistRepository.save(playlist);

    return this.getPlaylist(playlistId);
  }

  async removeTrackFromPlaylist(
    userId: string,
    playlistId: string,
    trackId: string,
  ) {
    const playlist = await this.playlistRepository.findOne({
      where: { id: playlistId },
    });
    if (!playlist) {
      throw new NotFoundException('Playlist not found');
    }

    if (playlist.ownerId !== userId && !playlist.isCollaborative) {
      throw new ForbiddenException(
        'You do not have permission to edit this playlist',
      );
    }

    const pt = await this.playlistTrackRepository.findOne({
      where: { playlistId, trackId },
    });
    if (!pt) {
      throw new NotFoundException('Track not found in playlist');
    }

    await this.playlistTrackRepository.remove(pt);

    // Re-index remaining track positions to keep contiguous order
    const remaining = await this.playlistTrackRepository.find({
      where: { playlistId },
      order: { position: 'ASC' },
    });
    for (let i = 0; i < remaining.length; i++) {
      remaining[i].position = i;
      await this.playlistTrackRepository.save(remaining[i]);
    }

    // Update playlist updatedAt
    playlist.updatedAt = new Date();
    await this.playlistRepository.save(playlist);

    return this.getPlaylist(playlistId);
  }

  async reorderPlaylistTracks(
    userId: string,
    playlistId: string,
    orderedTrackIds: string[],
  ) {
    const playlist = await this.playlistRepository.findOne({
      where: { id: playlistId },
    });
    if (!playlist) {
      throw new NotFoundException('Playlist not found');
    }

    if (playlist.ownerId !== userId && !playlist.isCollaborative) {
      throw new ForbiddenException(
        'You do not have permission to edit this playlist',
      );
    }

    // Update position of each track matching the provided list order
    for (let i = 0; i < orderedTrackIds.length; i++) {
      const trackId = orderedTrackIds[i];
      await this.playlistTrackRepository.update(
        { playlistId, trackId },
        { position: i },
      );
    }

    playlist.updatedAt = new Date();
    await this.playlistRepository.save(playlist);

    return this.getPlaylist(playlistId);
  }
}
