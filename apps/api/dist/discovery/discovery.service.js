"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var DiscoveryService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DiscoveryService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const ioredis_1 = __importDefault(require("ioredis"));
const discovery_event_entity_1 = require("./entities/discovery-event.entity");
const user_embedding_entity_1 = require("./entities/user-embedding.entity");
const track_feature_entity_1 = require("./entities/track-feature.entity");
const catalog_service_1 = require("../catalog/catalog.service");
const cohort_helper_1 = require("./cohort.helper");
const playlist_entity_1 = require("../library/entities/playlist.entity");
const playlist_track_entity_1 = require("../library/entities/playlist-track.entity");
let DiscoveryService = DiscoveryService_1 = class DiscoveryService {
    eventRepository;
    embeddingRepository;
    featureRepository;
    playlistRepository;
    playlistTrackRepository;
    catalogService;
    cohortHelper;
    logger = new common_1.Logger(DiscoveryService_1.name);
    redisClient = null;
    memoryStore = new Map();
    RECO_URL = process.env.RECO_SERVICE_URL || 'http://localhost:5001';
    cbState = 'CLOSED';
    cbFailureCount = 0;
    cbLastFailureTime = 0;
    CB_FAILURE_THRESHOLD = 3;
    CB_COOLDOWN_MS = 30000;
    constructor(eventRepository, embeddingRepository, featureRepository, playlistRepository, playlistTrackRepository, catalogService, cohortHelper) {
        this.eventRepository = eventRepository;
        this.embeddingRepository = embeddingRepository;
        this.featureRepository = featureRepository;
        this.playlistRepository = playlistRepository;
        this.playlistTrackRepository = playlistTrackRepository;
        this.catalogService = catalogService;
        this.cohortHelper = cohortHelper;
        const redisUrl = process.env.REDIS_URL;
        if (redisUrl) {
            try {
                this.redisClient = new ioredis_1.default(redisUrl);
            }
            catch (err) {
                this.logger.error('Failed to initialize Redis in DiscoveryService', err);
            }
        }
    }
    async shouldPrompt(userId, sessionId, context) {
        if (!this.cohortHelper.isDiscoveryActive(userId)) {
            return { prompt: false, reason: 'Control cohort suppression' };
        }
        if (context && context.isPrivateSession) {
            return { prompt: false, reason: 'Private session active' };
        }
        if (context && context.isQueuedAlbum) {
            return { prompt: false, reason: 'User playing queued album' };
        }
        const key = `disc:counter:${sessionId}`;
        let currentCount = 0;
        if (this.redisClient) {
            currentCount = await this.redisClient.incr(key);
            await this.redisClient.expire(key, 86400);
        }
        else {
            const val = (this.memoryStore.get(key) || 0) + 1;
            this.memoryStore.set(key, val);
            currentCount = val;
        }
        const threshold = 5;
        if (currentCount >= threshold) {
            return { prompt: true, reason: 'Song threshold met' };
        }
        return {
            prompt: false,
            reason: `Threshold not met (${currentCount}/${threshold})`,
        };
    }
    async getCandidatesPair(userId) {
        const now = Date.now();
        const pastEvents = await this.eventRepository.find({
            where: { userId },
            select: { candidateAId: true, candidateBId: true },
        });
        const presentedIds = new Set();
        for (const e of pastEvents) {
            if (e.candidateAId)
                presentedIds.add(e.candidateAId);
            if (e.candidateBId)
                presentedIds.add(e.candidateBId);
        }
        if (this.cbState === 'OPEN') {
            if (now - this.cbLastFailureTime > this.CB_COOLDOWN_MS) {
                this.cbState = 'HALF_OPEN';
                this.logger.log('Circuit Breaker entering HALF_OPEN state; testing FastAPI service...');
            }
            else {
                this.logger.warn(`Circuit Breaker is OPEN. Falling back to local heuristic immediately (cooldown remaining: ${Math.round((this.CB_COOLDOWN_MS - (now - this.cbLastFailureTime)) / 1000)}s)`);
                return this.getHeuristicFallbackPair(presentedIds);
            }
        }
        try {
            const hour = new Date().getUTCHours();
            let timeOfDay = 'afternoon';
            if (hour >= 6 && hour < 12)
                timeOfDay = 'morning';
            else if (hour >= 18 && hour < 24)
                timeOfDay = 'evening';
            else if (hour >= 0 && hour < 6)
                timeOfDay = 'night';
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 2000);
            const res = await fetch(`${this.RECO_URL}/reco/candidates/pair`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, context: { timeOfDay } }),
                signal: controller.signal,
            });
            clearTimeout(timeoutId);
            if (res.ok) {
                const pair = await res.json();
                if (this.cbState === 'HALF_OPEN') {
                    this.logger.log('Circuit Breaker reset to CLOSED after successful request in HALF_OPEN state');
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
        }
        catch (err) {
            this.cbFailureCount++;
            if (this.cbFailureCount >= this.CB_FAILURE_THRESHOLD) {
                this.cbState = 'OPEN';
                this.cbLastFailureTime = now;
                this.logger.error(`Circuit Breaker tripped to OPEN. FastAPI service failed consecutive requests (${this.cbFailureCount}/${this.CB_FAILURE_THRESHOLD}).`);
            }
            this.logger.warn('FastAPI Recommendation service down or timed out. Falling back to heuristic.', err);
        }
        return this.getHeuristicFallbackPair(presentedIds);
    }
    async getHeuristicFallbackPair(presentedIds) {
        const tracks = await this.catalogService.getPopularTracks(30);
        if (tracks.length < 2) {
            throw new common_1.NotFoundException('Not enough tracks in catalog to generate pair');
        }
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
    async recordChoice(userId, sessionId, promptId, candidateAId, candidateBId, chosenTrackId, latencyMs = 0, previewBehavior) {
        const idempotencyKey = `prompt:resolved:${promptId}`;
        const wasResolved = this.redisClient
            ? await this.redisClient.get(idempotencyKey)
            : this.memoryStore.get(idempotencyKey);
        if (wasResolved) {
            return JSON.parse(wasResolved);
        }
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
        const counterKey = `disc:counter:${sessionId}`;
        if (this.redisClient) {
            await this.redisClient.set(counterKey, '0');
        }
        else {
            this.memoryStore.set(counterKey, 0);
        }
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
                this.logger.error('Failed to report choice to FastAPI Reco service', err);
            });
        }
        const response = {
            eventId: savedEvent.id,
            status: 'recorded',
            chosenTrackId,
        };
        if (this.redisClient) {
            await this.redisClient.set(idempotencyKey, JSON.stringify(response), 'EX', 3600);
        }
        else {
            this.memoryStore.set(idempotencyKey, JSON.stringify(response));
        }
        return response;
    }
    async generateDailyMixes(userId) {
        const userEmbRecord = await this.embeddingRepository.findOne({
            where: { userId },
        });
        const userEmb = userEmbRecord
            ? userEmbRecord.embedding
            : Array(128)
                .fill(0)
                .map(() => Math.random() - 0.5);
        const allTracks = await this.catalogService.getTracks();
        if (allTracks.length === 0) {
            return { status: 'no_tracks_in_catalog' };
        }
        const scoredTracks = [];
        for (const track of allTracks) {
            const featRecord = await this.featureRepository.findOne({
                where: { trackId: track.id },
            });
            const feat = featRecord
                ? featRecord.features
                : Array(128)
                    .fill(0)
                    .map(() => Math.random() - 0.5);
            let dot = 0;
            let normA = 0;
            let normB = 0;
            for (let i = 0; i < 128; i++) {
                dot += (userEmb[i] || 0) * (feat[i] || 0);
                normA += (userEmb[i] || 0) ** 2;
                normB += (feat[i] || 0) ** 2;
            }
            const similarity = normA > 0 && normB > 0
                ? dot / (Math.sqrt(normA) * Math.sqrt(normB))
                : 0;
            scoredTracks.push({ track, similarity });
        }
        scoredTracks.sort((a, b) => b.similarity - a.similarity);
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
        if (chillTracks.length === 0) {
            chillTracks.push(...allTracks.slice(0, Math.ceil(allTracks.length / 2)));
        }
        if (energyTracks.length === 0) {
            energyTracks.push(...allTracks.filter((t) => !chillTracks.includes(t)));
        }
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
    async getDiscoveryRecap(userId) {
        const events = await this.eventRepository.find({
            where: { userId },
            order: { timestamp: 'ASC' },
        });
        const totalPrompts = events.length;
        const choices = events.filter((e) => e.chosenTrackId !== null && e.chosenTrackId !== '');
        const skips = events.filter((e) => e.chosenTrackId === null || e.chosenTrackId === '');
        const totalChoices = choices.length;
        const totalSkips = skips.length;
        const choiceRate = totalPrompts > 0 ? (totalChoices / totalPrompts) * 100 : 0;
        let totalLatency = 0;
        choices.forEach((c) => {
            totalLatency += c.latencyMs || 0;
        });
        const avgLatencyMs = totalChoices > 0 ? Math.round(totalLatency / totalChoices) : 0;
        const artistCounts = {};
        for (const choice of choices) {
            if (choice.chosenTrackId) {
                try {
                    const track = await this.catalogService.getTrack(choice.chosenTrackId);
                    if (track && track.artist) {
                        const name = track.artist.name;
                        artistCounts[name] = (artistCounts[name] || 0) + 1;
                    }
                }
                catch (err) {
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
};
exports.DiscoveryService = DiscoveryService;
exports.DiscoveryService = DiscoveryService = DiscoveryService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(discovery_event_entity_1.DiscoveryEvent)),
    __param(1, (0, typeorm_1.InjectRepository)(user_embedding_entity_1.UserEmbedding)),
    __param(2, (0, typeorm_1.InjectRepository)(track_feature_entity_1.TrackFeature)),
    __param(3, (0, typeorm_1.InjectRepository)(playlist_entity_1.Playlist)),
    __param(4, (0, typeorm_1.InjectRepository)(playlist_track_entity_1.PlaylistTrack)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        catalog_service_1.CatalogService,
        cohort_helper_1.CohortHelper])
], DiscoveryService);
//# sourceMappingURL=discovery.service.js.map