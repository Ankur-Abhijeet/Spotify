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
exports.LibraryController = void 0;
const common_1 = require("@nestjs/common");
const library_service_1 = require("./library.service");
const auth_guard_1 = require("../auth/auth.guard");
let LibraryController = class LibraryController {
    libraryService;
    constructor(libraryService) {
        this.libraryService = libraryService;
    }
    async getLibrary(req) {
        return this.libraryService.getLibrary(req.user.sub);
    }
    async likeTrack(req, trackId) {
        return this.libraryService.likeTrack(req.user.sub, trackId);
    }
    async unlikeTrack(req, trackId) {
        return this.libraryService.unlikeTrack(req.user.sub, trackId);
    }
    async followArtist(req, artistId) {
        return this.libraryService.followArtist(req.user.sub, artistId);
    }
    async unfollowArtist(req, artistId) {
        return this.libraryService.unfollowArtist(req.user.sub, artistId);
    }
    async createPlaylist(req, body) {
        return this.libraryService.createPlaylist(req.user.sub, body.title, body.description);
    }
    async getPlaylist(id) {
        return this.libraryService.getPlaylist(id);
    }
    async addTrack(req, playlistId, body) {
        return this.libraryService.addTrackToPlaylist(req.user.sub, playlistId, body.trackId);
    }
    async removeTrack(req, playlistId, trackId) {
        return this.libraryService.removeTrackFromPlaylist(req.user.sub, playlistId, trackId);
    }
    async reorderTracks(req, playlistId, body) {
        return this.libraryService.reorderPlaylistTracks(req.user.sub, playlistId, body.orderedTrackIds);
    }
};
exports.LibraryController = LibraryController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], LibraryController.prototype, "getLibrary", null);
__decorate([
    (0, common_1.Post)('like/:trackId'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('trackId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], LibraryController.prototype, "likeTrack", null);
__decorate([
    (0, common_1.Delete)('like/:trackId'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('trackId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], LibraryController.prototype, "unlikeTrack", null);
__decorate([
    (0, common_1.Post)('follow/artist/:artistId'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('artistId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], LibraryController.prototype, "followArtist", null);
__decorate([
    (0, common_1.Delete)('follow/artist/:artistId'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('artistId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], LibraryController.prototype, "unfollowArtist", null);
__decorate([
    (0, common_1.Post)('playlists'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], LibraryController.prototype, "createPlaylist", null);
__decorate([
    (0, common_1.Get)('playlists/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], LibraryController.prototype, "getPlaylist", null);
__decorate([
    (0, common_1.Post)('playlists/:id/tracks'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], LibraryController.prototype, "addTrack", null);
__decorate([
    (0, common_1.Delete)('playlists/:id/tracks/:trackId'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Param)('trackId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], LibraryController.prototype, "removeTrack", null);
__decorate([
    (0, common_1.Patch)('playlists/:id/tracks/reorder'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], LibraryController.prototype, "reorderTracks", null);
exports.LibraryController = LibraryController = __decorate([
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard),
    (0, common_1.Controller)('library'),
    __metadata("design:paramtypes", [library_service_1.LibraryService])
], LibraryController);
//# sourceMappingURL=library.controller.js.map