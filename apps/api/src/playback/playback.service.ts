import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import Redis from 'ioredis';
import { CatalogService } from '../catalog/catalog.service';

@Injectable()
export class PlaybackService {
  private readonly logger = new Logger(PlaybackService.name);
  private readonly redisClient: Redis | null = null;
  private readonly memoryStore = new Map<string, any>();

  constructor(private readonly catalogService: CatalogService) {
    const redisUrl = process.env.REDIS_URL;
    if (redisUrl) {
      try {
        this.redisClient = new Redis(redisUrl);
        this.logger.log('Connected to Upstash Redis successfully');
      } catch (err) {
        this.logger.error(
          'Failed to initialize Redis client, falling back to memory store',
          err,
        );
      }
    } else {
      this.logger.warn(
        'REDIS_URL not set, using in-memory fallback for playback sessions',
      );
    }
  }

  async getStreamInfo(trackId: string) {
    const track = await this.catalogService.getTrack(trackId);
    return {
      trackId: track.id,
      audioUrl: track.audioUrl,
      title: track.title,
      artistName: track.artist?.name,
    };
  }

  async getSession(userId: string) {
    const key = `session:${userId}`;
    const data = this.redisClient
      ? await this.redisClient.get(key)
      : this.memoryStore.get(key);

    if (!data) {
      // Return default initial session state
      return {
        userId,
        currentTrackId: null,
        queue: [],
        position: 0,
        isPlaying: false,
      };
    }
    return JSON.parse(data);
  }

  async saveSession(userId: string, sessionState: any) {
    const key = `session:${userId}`;
    const serialized = JSON.stringify(sessionState);

    if (this.redisClient) {
      await this.redisClient.set(key, serialized, 'EX', 86400); // 24-hour expiry
    } else {
      this.memoryStore.set(key, serialized);
    }
    return sessionState;
  }

  async updateQueue(userId: string, trackIds: string[]) {
    const session = await this.getSession(userId);
    session.queue = trackIds;
    return this.saveSession(userId, session);
  }

  async playTrack(userId: string, trackId: string) {
    const session = await this.getSession(userId);

    // Validate track exists
    await this.catalogService.getTrack(trackId);

    session.currentTrackId = trackId;
    session.isPlaying = true;
    session.position = 0;

    // Add to queue if not present
    if (!session.queue.includes(trackId)) {
      session.queue.push(trackId);
    }

    return this.saveSession(userId, session);
  }

  async updatePosition(userId: string, position: number) {
    const session = await this.getSession(userId);
    session.position = position;
    return this.saveSession(userId, session);
  }
}
