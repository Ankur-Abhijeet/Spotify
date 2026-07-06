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
exports.PlaybackController = void 0;
const common_1 = require("@nestjs/common");
const playback_service_1 = require("./playback.service");
const auth_guard_1 = require("../auth/auth.guard");
let PlaybackController = class PlaybackController {
    playbackService;
    constructor(playbackService) {
        this.playbackService = playbackService;
    }
    async getStream(trackId) {
        return this.playbackService.getStreamInfo(trackId);
    }
    async getSession(req) {
        return this.playbackService.getSession(req.user.sub);
    }
    async playTrack(req, body) {
        return this.playbackService.playTrack(req.user.sub, body.trackId);
    }
    async updateQueue(req, body) {
        return this.playbackService.updateQueue(req.user.sub, body.trackIds);
    }
    async updatePosition(req, body) {
        return this.playbackService.updatePosition(req.user.sub, body.position);
    }
};
exports.PlaybackController = PlaybackController;
__decorate([
    (0, common_1.Get)('stream/:trackId'),
    __param(0, (0, common_1.Param)('trackId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PlaybackController.prototype, "getStream", null);
__decorate([
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard),
    (0, common_1.Get)('session'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PlaybackController.prototype, "getSession", null);
__decorate([
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard),
    (0, common_1.Post)('session'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], PlaybackController.prototype, "playTrack", null);
__decorate([
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard),
    (0, common_1.Patch)('session/queue'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], PlaybackController.prototype, "updateQueue", null);
__decorate([
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard),
    (0, common_1.Put)('session/position'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], PlaybackController.prototype, "updatePosition", null);
exports.PlaybackController = PlaybackController = __decorate([
    (0, common_1.Controller)('playback'),
    __metadata("design:paramtypes", [playback_service_1.PlaybackService])
], PlaybackController);
//# sourceMappingURL=playback.controller.js.map