import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Follow } from './entities/follow.entity';
import { PlaybackEvent } from '../playback/entities/playback-event.entity';
import { CatalogService } from '../catalog/catalog.service';
import { LibraryService } from '../library/library.service';

@Injectable()
export class SocialService {
  constructor(
    @InjectRepository(Follow)
    private readonly followRepository: Repository<Follow>,
    @InjectRepository(PlaybackEvent)
    private readonly playbackEventRepository: Repository<PlaybackEvent>,
    private readonly catalogService: CatalogService,
    private readonly libraryService: LibraryService,
  ) {}

  async followUser(followerId: string, followeeId: string) {
    if (followerId === followeeId) {
      throw new ConflictException('You cannot follow yourself');
    }

    const existing = await this.followRepository.findOne({
      where: { followerId, followeeId },
    });
    if (existing) {
      return { status: 'already_following' };
    }

    const follow = this.followRepository.create({ followerId, followeeId });
    await this.followRepository.save(follow);
    return { status: 'followed', followeeId };
  }

  async unfollowUser(followerId: string, followeeId: string) {
    const res = await this.followRepository.delete({ followerId, followeeId });
    if (res.affected === 0) {
      throw new NotFoundException('Follow relationship not found');
    }
    return { status: 'unfollowed', followeeId };
  }

  async getFollowing(followerId: string) {
    return this.followRepository.find({
      where: { followerId },
      relations: { followee: true },
    });
  }

  async getFriendActivity(userId: string) {
    // 1. Fetch user follows
    const follows = await this.followRepository.find({
      where: { followerId: userId },
    });
    const followeeIds = follows.map((f) => f.followeeId);

    if (followeeIds.length === 0) {
      return [];
    }

    // 2. Fetch recent playbacks for these users
    // We select the latest playback event for each followed user to show what they are listening to
    const activities = [];
    for (const fid of followeeIds) {
      const lastEvent = await this.playbackEventRepository.findOne({
        where: { userId: fid, eventType: 'play' },
        order: { timestamp: 'DESC' },
        relations: { user: true },
      });

      if (lastEvent) {
        try {
          const track = await this.catalogService.getTrack(lastEvent.trackId);
          activities.push({
            user: { id: lastEvent.user.id, email: lastEvent.user.email },
            track: {
              id: track.id,
              title: track.title,
              artist: track.artist?.name,
              albumArt: track.album?.artUrl,
            },
            timestamp: lastEvent.timestamp,
          });
        } catch (err) {
          // ignore track detail resolve errors
        }
      }
    }

    // Sort descending by timestamp
    activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    return activities;
  }

  async generateBlend(userId: string, friendId: string) {
    // 1. Fetch tracks in catalog
    const tracks = await this.catalogService.getTracks();
    if (tracks.length === 0) {
      throw new NotFoundException('No tracks available to build Blend');
    }

    // 2. Build a heuristic Blend playlist (picks 5 random tracks)
    // In production this matches vector similarities; for sandbox MVP we pool tracks
    const blendTracks = [];
    const pool = [...tracks];
    const limit = Math.min(5, pool.length);
    for (let i = 0; i < limit; i++) {
      const idx = Math.floor(Math.random() * pool.length);
      blendTracks.push(pool.splice(idx, 1)[0]);
    }

    // 3. Create Blend playlist
    const playlist = await this.libraryService.createPlaylist(
      userId,
      'Blend: Discovery Mix',
      'Shared preferences sandbox mix',
    );

    // 4. Populate tracks
    for (let i = 0; i < blendTracks.length; i++) {
      await this.libraryService.addTrackToPlaylist(
        userId,
        playlist.id,
        blendTracks[i].id,
      );
    }

    return {
      status: 'created',
      playlistId: playlist.id,
      tracksCount: blendTracks.length,
    };
  }
}
