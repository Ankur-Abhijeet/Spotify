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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var PlaybackService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlaybackService = void 0;
const common_1 = require("@nestjs/common");
const ioredis_1 = __importDefault(require("ioredis"));
const catalog_service_1 = require("../catalog/catalog.service");
let PlaybackService = PlaybackService_1 = class PlaybackService {
    catalogService;
    logger = new common_1.Logger(PlaybackService_1.name);
    redisClient = null;
    memoryStore = new Map();
    constructor(catalogService) {
        this.catalogService = catalogService;
        const redisUrl = process.env.REDIS_URL;
        if (redisUrl) {
            try {
                this.redisClient = new ioredis_1.default(redisUrl);
                this.logger.log('Connected to Upstash Redis successfully');
            }
            catch (err) {
                this.logger.error('Failed to initialize Redis client, falling back to memory store', err);
            }
        }
        else {
            this.logger.warn('REDIS_URL not set, using in-memory fallback for playback sessions');
        }
    }
    async getStreamInfo(trackId) {
        const track = await this.catalogService.getTrack(trackId);
        return {
            trackId: track.id,
            audioUrl: track.audioUrl,
            title: track.title,
            artistName: track.artist?.name,
        };
    }
    async getSession(userId) {
        const key = `session:${userId}`;
        const data = this.redisClient
            ? await this.redisClient.get(key)
            : this.memoryStore.get(key);
        if (!data) {
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
    async saveSession(userId, sessionState) {
        const key = `session:${userId}`;
        const serialized = JSON.stringify(sessionState);
        if (this.redisClient) {
            await this.redisClient.set(key, serialized, 'EX', 86400);
        }
        else {
            this.memoryStore.set(key, serialized);
        }
        return sessionState;
    }
    async updateQueue(userId, trackIds) {
        const session = await this.getSession(userId);
        session.queue = trackIds;
        return this.saveSession(userId, session);
    }
    async playTrack(userId, trackId) {
        const session = await this.getSession(userId);
        await this.catalogService.getTrack(trackId);
        session.currentTrackId = trackId;
        session.isPlaying = true;
        session.position = 0;
        if (!session.queue.includes(trackId)) {
            session.queue.push(trackId);
        }
        return this.saveSession(userId, session);
    }
    async updatePosition(userId, position) {
        const session = await this.getSession(userId);
        session.position = position;
        return this.saveSession(userId, session);
    }
};
exports.PlaybackService = PlaybackService;
exports.PlaybackService = PlaybackService = PlaybackService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [catalog_service_1.CatalogService])
], PlaybackService);
//# sourceMappingURL=playback.service.js.map