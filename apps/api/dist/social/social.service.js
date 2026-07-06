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
Object.defineProperty(exports, "__esModule", { value: true });
exports.SocialService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const follow_entity_1 = require("./entities/follow.entity");
const playback_event_entity_1 = require("../playback/entities/playback-event.entity");
const catalog_service_1 = require("../catalog/catalog.service");
const library_service_1 = require("../library/library.service");
let SocialService = class SocialService {
    followRepository;
    playbackEventRepository;
    catalogService;
    libraryService;
    constructor(followRepository, playbackEventRepository, catalogService, libraryService) {
        this.followRepository = followRepository;
        this.playbackEventRepository = playbackEventRepository;
        this.catalogService = catalogService;
        this.libraryService = libraryService;
    }
    async followUser(followerId, followeeId) {
        if (followerId === followeeId) {
            throw new common_1.ConflictException('You cannot follow yourself');
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
    async unfollowUser(followerId, followeeId) {
        const res = await this.followRepository.delete({ followerId, followeeId });
        if (res.affected === 0) {
            throw new common_1.NotFoundException('Follow relationship not found');
        }
        return { status: 'unfollowed', followeeId };
    }
    async getFollowing(followerId) {
        return this.followRepository.find({
            where: { followerId },
            relations: { followee: true },
        });
    }
    async getFriendActivity(userId) {
        const follows = await this.followRepository.find({
            where: { followerId: userId },
        });
        const followeeIds = follows.map((f) => f.followeeId);
        if (followeeIds.length === 0) {
            return [];
        }
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
                }
                catch (err) {
                }
            }
        }
        activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
        return activities;
    }
    async generateBlend(userId, friendId) {
        const tracks = await this.catalogService.getTracks();
        if (tracks.length === 0) {
            throw new common_1.NotFoundException('No tracks available to build Blend');
        }
        const blendTracks = [];
        const pool = [...tracks];
        const limit = Math.min(5, pool.length);
        for (let i = 0; i < limit; i++) {
            const idx = Math.floor(Math.random() * pool.length);
            blendTracks.push(pool.splice(idx, 1)[0]);
        }
        const playlist = await this.libraryService.createPlaylist(userId, 'Blend: Discovery Mix', 'Shared preferences sandbox mix');
        for (let i = 0; i < blendTracks.length; i++) {
            await this.libraryService.addTrackToPlaylist(userId, playlist.id, blendTracks[i].id);
        }
        return {
            status: 'created',
            playlistId: playlist.id,
            tracksCount: blendTracks.length,
        };
    }
};
exports.SocialService = SocialService;
exports.SocialService = SocialService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(follow_entity_1.Follow)),
    __param(1, (0, typeorm_1.InjectRepository)(playback_event_entity_1.PlaybackEvent)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        catalog_service_1.CatalogService,
        library_service_1.LibraryService])
], SocialService);
//# sourceMappingURL=social.service.js.map