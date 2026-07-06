import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import Redis from 'ioredis';
import { DiscoveryEvent } from './entities/discovery-event.entity';
import { UserEmbedding } from './entities/user-embedding.entity';
import { TrackFeature } from './entities/track-feature.entity';
import { CatalogService } from '../catalog/catalog.service';
import { CohortHelper } from './cohort.helper';
import { Playlist } from '../library/entities/playlist.entity';
import { PlaylistTrack } from '../library/entities/playlist-track.entity';

@Injectable()
export class DiscoveryService {
  private readonly logger = new Logger(DiscoveryService.name);
  private readonly redisClient: Redis | null = null;
  private readonly memoryStore = new Map<string, any>();
  private readonly RECO_URL =
    process.env.RECO_SERVICE_URL || 'http://localhost:5001';

  // Resilience Circuit Breaker state
  private cbState: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  private cbFailureCount = 0;
  private cbLastFailureTime = 0;
  private readonly CB_FAILURE_THRESHOLD = 3;
  private readonly CB_COOLDOWN_MS = 30000; // 30 seconds

  constructor(
    @InjectRepository(DiscoveryEvent)
    private readonly eventRepository: Repository<DiscoveryEvent>,
    @InjectRepository(UserEmbedding)
    private readonly embeddingRepository: Repository<UserEmbedding>,
    @InjectRepository(TrackFeature)
    private readonly featureRepository: Repository<TrackFeature>,
    @InjectRepository(Playlist)
    private readonly playlistRepository: Repository<Playlist>,
    @InjectRepository(PlaylistTrack)
    private readonly playlistTrackRepository: Repository<PlaylistTrack>,
    private readonly catalogService: CatalogService,
    private readonly cohortHelper: CohortHelper,
  ) {
    const redisUrl = process.env.REDIS_URL;
    if (redisUrl) {
      try {
        this.redisClient = new Redis(redisUrl);
      } catch (err) {
        this.logger.error(
          'Failed to initialize Redis in DiscoveryService',
          err,
        );
      }
    }
  }

  async shouldPrompt(
    userId: string,
    sessionId: string,
    context?: Record<string, any>,
  ) {
    // 0. Experiment Cohort check: Discovery enabled?
    if (!this.cohortHelper.isDiscoveryActive(userId)) {
      return { prompt: false, reason: 'Control cohort suppression' };
    }

    // 1. Guard check: Private session active?
    if (context && context.isPrivateSession) {
      return { prompt: false, reason: 'Private session active' };
    }

    // 2. Guard check: Queued album active?
    if (context && context.isQueuedAlbum) {
      return { prompt: false, reason: 'User playing queued album' };
    }

    // 3. Trigger check: increment counter and check if threshold met
    const key = `disc:counter:${sessionId}`;
    let currentCount = 0;

    if (this.redisClient) {
      currentCount = await this.redisClient.incr(key);
      await this.redisClient.expire(key, 86400); // 24h expiry
    } else {
      const val = (this.memoryStore.get(key) || 0) + 1;
      this.memoryStore.set(key, val);
      currentCount = val;
    }

    // Default trigger interval is every 5 tracks. Can be dynamic N between 4 and 8.
    const threshold = 5;
    if (currentCount >= threshold) {
      return { prompt: true, reason: 'Song threshold met' };
    }

    return {
      prompt: false,
      reason: `Threshold not met (${currentCount}/${threshold})`,
    };
  }

  async getCandidatesPair(userId: string) {
    const now = Date.now();

    // Fetch past choices/rejections to avoid repeats
    const pastEvents = await this.eventRepository.find({
      where: { userId },
      select: { candidateAId: true, candidateBId: true },
    });
    const presentedIds = new Set<string>();
    for (const e of pastEvents) {
      if (e.candidateAId) presentedIds.add(e.candidateAId);
      if (e.candidateBId) presentedIds.add(e.candidateBId);
    }

    // Check Circuit Breaker state
    if (this.cbState === 'OPEN') {
      if (now - this.cbLastFailureTime > this.CB_COOLDOWN_MS) {
        this.cbState = 'HALF_OPEN';
        this.logger.log(
          'Circuit Breaker entering HALF_OPEN state; testing FastAPI service...',
        );
      } else {
        this.logger.warn(
          `Circuit Breaker is OPEN. Falling back to local heuristic immediately (cooldown remaining: ${Math.round((this.CB_COOLDOWN_MS - (now - this.cbLastFailureTime)) / 1000)}s)`,
        );
        return this.getHeuristicFallbackPair(presentedIds);
      }
    }

    try {
      // Determine timeOfDay context dynamically based on server UTC hour
      const hour = new Date().getUTCHours();
      let timeOfDay = 'afternoon';
      if (hour >= 6 && hour < 12) timeOfDay = 'morning';
      else if (hour >= 18 && hour < 24) timeOfDay = 'evening';
      else if (hour >= 0 && hour < 6) timeOfDay = 'night';

      // 1. Attempt to fetch pair from Python Recommendation Service
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000); // 2s timeout

      const res = await fetch(`${this.RECO_URL}/reco/candidates/pair`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, context: { timeOfDay } }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const pair = await res.json();

        // Reset circuit breaker on success
        if (this.cbState === 'HALF_OPEN') {
          this.logger.log(
            'Circuit Breaker reset to CLOSED after successful request in HALF_OPEN state',
          );
        }
        this.cbState = 'CLOSED';
        this.cbFailureCount = 0;

        return {
          candidateA: await this.catalogService.getTrack(pair.candidateAId),
          candidateB: await this.catalogService.getTrack(pair.candidateBId),
          source: 'reco_service',
        };
      }

      throw new Error(`FastAPI service returned status ${res.status}`);
    } catch (err) {
      this.cbFailureCount++;
      if (this.cbFailureCount >= this.CB_FAILURE_THRESHOLD) {
        this.cbState = 'OPEN';
        this.cbLastFailureTime = now;
        this.logger.error(
          `Circuit Breaker tripped to OPEN. FastAPI service failed consecutive requests (${this.cbFailureCount}/${this.CB_FAILURE_THRESHOLD}).`,
        );
      }
      this.logger.warn(
        'FastAPI Recommendation service down or timed out. Falling back to heuristic.',
        err,
      );
    }

    return this.getHeuristicFallbackPair(presentedIds);
  }

  private async getHeuristicFallbackPair(presentedIds: Set<string>) {
    const tracks = await this.catalogService.getPopularTracks(30);
    if (tracks.length < 2) {
      throw new NotFoundException(
        'Not enough tracks in catalog to generate pair',
      );
    }

    // Filter out previously presented track IDs
    const eligibleTracks = tracks.filter((t) => !presentedIds.has(t.id));
    const pool = eligibleTracks.length >= 2 ? eligibleTracks : tracks;

    const idxA = Math.floor(Math.random() * pool.length);
    let idxB = Math.floor(Math.random() * pool.length);
    while (idxB === idxA && pool.length > 1) {
      idxB = Math.floor(Math.random() * pool.length);
    }

    return {
      candidateA: pool[idxA],
      candidateB: pool[idxB],
      source: 'heuristic_fallback',
    };
  }

  async recordChoice(
    userId: string,
    sessionId: string,
    promptId: string, // used for idempotency
    candidateAId: string,
    candidateBId: string,
    chosenTrackId?: string,
    latencyMs = 0,
    previewBehavior?: Record<string, any>,
  ) {
    // 1. Check idempotency
    const idempotencyKey = `prompt:resolved:${promptId}`;
    const wasResolved = this.redisClient
      ? await this.redisClient.get(idempotencyKey)
      : this.memoryStore.get(idempotencyKey);

    if (wasResolved) {
      return JSON.parse(wasResolved);
    }

    // 2. Insert event in database
    const rejectedTrackId = chosenTrackId
      ? chosenTrackId === candidateAId
        ? candidateBId
        : candidateAId
      : undefined;

    const event = this.eventRepository.create({
      userId,
      sessionId,
      candidateAId,
      candidateBId,
      chosenTrackId,
      rejectedTrackId,
      latencyMs,
      previewBehavior,
    });

    const savedEvent = await this.eventRepository.save(event);

    // 3. Reset trigger counter for session
    const counterKey = `disc:counter:${sessionId}`;
    if (this.redisClient) {
      await this.redisClient.set(counterKey, '0');
    } else {
      this.memoryStore.set(counterKey, 0);
    }

    // 4. Send event asynchronously to Python Recommendation service for online learning
    if (chosenTrackId && rejectedTrackId) {
      void fetch(`${this.RECO_URL}/reco/events/choice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          chosenTrackId,
          rejectedTrackId,
        }),
      }).catch((err) => {
        this.logger.error(
          'Failed to report choice to FastAPI Reco service',
          err,
        );
      });
    }

    const response = {
      eventId: savedEvent.id,
      status: 'recorded',
      chosenTrackId,
    };

    // Save resolution state for idempotency (expire after 1 hour)
    if (this.redisClient) {
      await this.redisClient.set(
        idempotencyKey,
        JSON.stringify(response),
        'EX',
        3600,
      );
    } else {
      this.memoryStore.set(idempotencyKey, JSON.stringify(response));
    }

    return response;
  }

  async generateDailyMixes(userId: string) {
    // 1. Fetch user embedding (fallback to default if none)
    const userEmbRecord = await this.embeddingRepository.findOne({
      where: { userId },
    });
    const userEmb = userEmbRecord
      ? userEmbRecord.embedding
      : Array(128)
          .fill(0)
          .map(() => Math.random() - 0.5);

    // 2. Fetch all tracks with artist relation
    const allTracks = await this.catalogService.getTracks();

    if (allTracks.length === 0) {
      return { status: 'no_tracks_in_catalog' };
    }

    // 3. Compute similarities and score tracks
    const scoredTracks = [];
    for (const track of allTracks) {
      // Find features or default
      const featRecord = await this.featureRepository.findOne({
        where: { trackId: track.id },
      });
      const feat = featRecord
        ? featRecord.features
        : Array(128)
            .fill(0)
            .map(() => Math.random() - 0.5);

      // Simple dot product/cosine similarity
      let dot = 0;
      let normA = 0;
      let normB = 0;
      for (let i = 0; i < 128; i++) {
        dot += (userEmb[i] || 0) * (feat[i] || 0);
        normA += (userEmb[i] || 0) ** 2;
        normB += (feat[i] || 0) ** 2;
      }
      const similarity =
        normA > 0 && normB > 0
          ? dot / (Math.sqrt(normA) * Math.sqrt(normB))
          : 0;
      scoredTracks.push({ track, similarity });
    }

    // Sort descending
    scoredTracks.sort((a, b) => b.similarity - a.similarity);

    // Split tracks: Chill Mix vs. Energy Mix
    const chillTracks = scoredTracks
      .filter((st) => {
        const name = st.track.artist?.name?.toLowerCase() || '';
        return name.includes('lofi') || name.includes('acoustic');
      })
      .map((st) => st.track);

    const energyTracks = scoredTracks
      .filter((st) => {
        const name = st.track.artist?.name?.toLowerCase() || '';
        return !name.includes('lofi') && !name.includes('acoustic');
      })
      .map((st) => st.track);

    // Ensure we have some tracks in both
    if (chillTracks.length === 0) {
      chillTracks.push(...allTracks.slice(0, Math.ceil(allTracks.length / 2)));
    }
    if (energyTracks.length === 0) {
      energyTracks.push(...allTracks.filter((t) => !chillTracks.includes(t)));
    }

    // Deconstruct and create Daily Mix 1 (Chill)
    await this.playlistRepository.delete({
      ownerId: userId,
      title: 'Daily Mix 1 (Chill)',
    });
    const playlist1 = this.playlistRepository.create({
      ownerId: userId,
      title: 'Daily Mix 1 (Chill)',
      description: 'Your personalized chill tunes, mixed daily.',
      isPublic: false,
      isCollaborative: false,
    });
    const savedPlaylist1 = await this.playlistRepository.save(playlist1);

    for (let i = 0; i < chillTracks.length; i++) {
      const pt = this.playlistTrackRepository.create({
        playlistId: savedPlaylist1.id,
        trackId: chillTracks[i].id,
        position: i,
      });
      await this.playlistTrackRepository.save(pt);
    }

    // Deconstruct and create Daily Mix 2 (Energy)
    await this.playlistRepository.delete({
      ownerId: userId,
      title: 'Daily Mix 2 (Energy)',
    });
    const playlist2 = this.playlistRepository.create({
      ownerId: userId,
      title: 'Daily Mix 2 (Energy)',
      description: 'Your personalized energetic tracks, mixed daily.',
      isPublic: false,
      isCollaborative: false,
    });
    const savedPlaylist2 = await this.playlistRepository.save(playlist2);

    for (let i = 0; i < energyTracks.length; i++) {
      const pt = this.playlistTrackRepository.create({
        playlistId: savedPlaylist2.id,
        trackId: energyTracks[i].id,
        position: i,
      });
      await this.playlistTrackRepository.save(pt);
    }

    return {
      status: 'created',
      mixes: [
        {
          id: savedPlaylist1.id,
          title: savedPlaylist1.title,
          count: chillTracks.length,
        },
        {
          id: savedPlaylist2.id,
          title: savedPlaylist2.title,
          count: energyTracks.length,
        },
      ],
    };
  }

  async getDiscoveryRecap(userId: string) {
    const events = await this.eventRepository.find({
      where: { userId },
      order: { timestamp: 'ASC' },
    });

    const totalPrompts = events.length;
    const choices = events.filter(
      (e) => e.chosenTrackId !== null && e.chosenTrackId !== '',
    );
    const skips = events.filter(
      (e) => e.chosenTrackId === null || e.chosenTrackId === '',
    );
    const totalChoices = choices.length;
    const totalSkips = skips.length;
    const choiceRate =
      totalPrompts > 0 ? (totalChoices / totalPrompts) * 100 : 0;

    let totalLatency = 0;
    choices.forEach((c) => {
      totalLatency += c.latencyMs || 0;
    });
    const avgLatencyMs =
      totalChoices > 0 ? Math.round(totalLatency / totalChoices) : 0;

    // Aggregate chosen track artists
    const artistCounts: Record<string, number> = {};
    for (const choice of choices) {
      if (choice.chosenTrackId) {
        try {
          const track = await this.catalogService.getTrack(
            choice.chosenTrackId,
          );
          if (track && track.artist) {
            const name = track.artist.name;
            artistCounts[name] = (artistCounts[name] || 0) + 1;
          }
        } catch (err) {
          // ignore if track not found
        }
      }
    }

    const topArtists = Object.entries(artistCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      totalPrompts,
      totalChoices,
      totalSkips,
      choiceRate: Math.round(choiceRate),
      avgLatencyMs,
      topArtists,
    };
  }
}
