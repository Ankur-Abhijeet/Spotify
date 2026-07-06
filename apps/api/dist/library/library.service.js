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
exports.LibraryService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const playlist_entity_1 = require("./entities/playlist.entity");
const playlist_track_entity_1 = require("./entities/playlist-track.entity");
const library_item_entity_1 = require("./entities/library-item.entity");
const catalog_service_1 = require("../catalog/catalog.service");
let LibraryService = class LibraryService {
    playlistRepository;
    playlistTrackRepository;
    libraryItemRepository;
    catalogService;
    constructor(playlistRepository, playlistTrackRepository, libraryItemRepository, catalogService) {
        this.playlistRepository = playlistRepository;
        this.playlistTrackRepository = playlistTrackRepository;
        this.libraryItemRepository = libraryItemRepository;
        this.catalogService = catalogService;
    }
    async getLibrary(userId) {
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
        const likedTracks = trackIds.length
            ? await this.catalogService.getTracksByIds(trackIds)
            : [];
        return {
            playlists,
            likedTracks,
            artistIds,
        };
    }
    async likeTrack(userId, trackId) {
        try {
            await this.catalogService.getTrack(trackId);
        }
        catch (e) {
            throw new common_1.NotFoundException('Track not found on Spotify');
        }
        const existing = await this.libraryItemRepository.findOne({
            where: { userId, itemType: 'track', itemId: trackId },
        });
        if (existing) {
            return existing;
        }
        const item = this.libraryItemRepository.create({
            userId,
            itemType: 'track',
            itemId: trackId,
        });
        return this.libraryItemRepository.save(item);
    }
    async unlikeTrack(userId, trackId) {
        const existing = await this.libraryItemRepository.findOne({
            where: { userId, itemType: 'track', itemId: trackId },
        });
        if (!existing) {
            throw new common_1.NotFoundException('Track not liked');
        }
        await this.libraryItemRepository.remove(existing);
        return { success: true };
    }
    async followArtist(userId, artistId) {
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
    async unfollowArtist(userId, artistId) {
        const existing = await this.libraryItemRepository.findOne({
            where: { userId, itemType: 'artist', itemId: artistId },
        });
        if (!existing) {
            throw new common_1.NotFoundException('Artist not followed');
        }
        await this.libraryItemRepository.remove(existing);
        return { success: true };
    }
    async createPlaylist(userId, title, description) {
        const playlist = this.playlistRepository.create({
            ownerId: userId,
            title,
            description,
        });
        return this.playlistRepository.save(playlist);
    }
    async getPlaylist(id) {
        const playlist = await this.playlistRepository.findOne({
            where: { id },
            relations: { owner: true },
        });
        if (!playlist) {
            throw new common_1.NotFoundException('Playlist not found');
        }
        const playlistTracks = await this.playlistTrackRepository.find({
            where: { playlistId: id },
            order: { position: 'ASC' },
        });
        const playlistTrackIds = playlistTracks.map((pt) => pt.trackId);
        const trackDetails = await this.catalogService.getTracksByIds(playlistTrackIds);
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
    async addTrackToPlaylist(userId, playlistId, trackId) {
        const playlist = await this.playlistRepository.findOne({
            where: { id: playlistId },
        });
        if (!playlist) {
            throw new common_1.NotFoundException('Playlist not found');
        }
        if (playlist.ownerId !== userId && !playlist.isCollaborative) {
            throw new common_1.ForbiddenException('You do not have permission to edit this playlist');
        }
        try {
            await this.catalogService.getTrack(trackId);
        }
        catch (e) {
            throw new common_1.NotFoundException('Track not found on Spotify');
        }
        const currentTracks = await this.playlistTrackRepository.find({
            where: { playlistId },
        });
        const nextPosition = currentTracks.length > 0
            ? Math.max(...currentTracks.map((t) => t.position)) + 1
            : 0;
        const playlistTrack = this.playlistTrackRepository.create({
            playlistId,
            trackId,
            position: nextPosition,
        });
        await this.playlistTrackRepository.save(playlistTrack);
        playlist.updatedAt = new Date();
        await this.playlistRepository.save(playlist);
        return this.getPlaylist(playlistId);
    }
    async removeTrackFromPlaylist(userId, playlistId, trackId) {
        const playlist = await this.playlistRepository.findOne({
            where: { id: playlistId },
        });
        if (!playlist) {
            throw new common_1.NotFoundException('Playlist not found');
        }
        if (playlist.ownerId !== userId && !playlist.isCollaborative) {
            throw new common_1.ForbiddenException('You do not have permission to edit this playlist');
        }
        const pt = await this.playlistTrackRepository.findOne({
            where: { playlistId, trackId },
        });
        if (!pt) {
            throw new common_1.NotFoundException('Track not found in playlist');
        }
        await this.playlistTrackRepository.remove(pt);
        const remaining = await this.playlistTrackRepository.find({
            where: { playlistId },
            order: { position: 'ASC' },
        });
        for (let i = 0; i < remaining.length; i++) {
            remaining[i].position = i;
            await this.playlistTrackRepository.save(remaining[i]);
        }
        playlist.updatedAt = new Date();
        await this.playlistRepository.save(playlist);
        return this.getPlaylist(playlistId);
    }
    async reorderPlaylistTracks(userId, playlistId, orderedTrackIds) {
        const playlist = await this.playlistRepository.findOne({
            where: { id: playlistId },
        });
        if (!playlist) {
            throw new common_1.NotFoundException('Playlist not found');
        }
        if (playlist.ownerId !== userId && !playlist.isCollaborative) {
            throw new common_1.ForbiddenException('You do not have permission to edit this playlist');
        }
        for (let i = 0; i < orderedTrackIds.length; i++) {
            const trackId = orderedTrackIds[i];
            await this.playlistTrackRepository.update({ playlistId, trackId }, { position: i });
        }
        playlist.updatedAt = new Date();
        await this.playlistRepository.save(playlist);
        return this.getPlaylist(playlistId);
    }
};
exports.LibraryService = LibraryService;
exports.LibraryService = LibraryService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(playlist_entity_1.Playlist)),
    __param(1, (0, typeorm_1.InjectRepository)(playlist_track_entity_1.PlaylistTrack)),
    __param(2, (0, typeorm_1.InjectRepository)(library_item_entity_1.LibraryItem)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        catalog_service_1.CatalogService])
], LibraryService);
//# sourceMappingURL=library.service.js.map