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
exports.DiscoveryController = void 0;
const common_1 = require("@nestjs/common");
const discovery_service_1 = require("./discovery.service");
const auth_guard_1 = require("../auth/auth.guard");
let DiscoveryController = class DiscoveryController {
    discoveryService;
    constructor(discoveryService) {
        this.discoveryService = discoveryService;
    }
    async shouldPrompt(req, sessionId, isPrivateSession, isQueuedAlbum) {
        return this.discoveryService.shouldPrompt(req.user.sub, sessionId, {
            isPrivateSession: isPrivateSession === 'true',
            isQueuedAlbum: isQueuedAlbum === 'true',
        });
    }
    async getPair(req) {
        return this.discoveryService.getCandidatesPair(req.user.sub);
    }
    async recordChoice(req, body) {
        return this.discoveryService.recordChoice(req.user.sub, body.sessionId, body.promptId, body.candidateAId, body.candidateBId, body.chosenTrackId, body.latencyMs, body.previewBehavior);
    }
    async generateMixes(req) {
        return this.discoveryService.generateDailyMixes(req.user.sub);
    }
    async getRecap(req) {
        return this.discoveryService.getDiscoveryRecap(req.user.sub);
    }
};
exports.DiscoveryController = DiscoveryController;
__decorate([
    (0, common_1.Get)('should-prompt'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)('sessionId')),
    __param(2, (0, common_1.Query)('isPrivateSession')),
    __param(3, (0, common_1.Query)('isQueuedAlbum')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String]),
    __metadata("design:returntype", Promise)
], DiscoveryController.prototype, "shouldPrompt", null);
__decorate([
    (0, common_1.Get)('pair'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], DiscoveryController.prototype, "getPair", null);
__decorate([
    (0, common_1.Post)('choice'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], DiscoveryController.prototype, "recordChoice", null);
__decorate([
    (0, common_1.Post)('mixes/generate'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], DiscoveryController.prototype, "generateMixes", null);
__decorate([
    (0, common_1.Get)('recap'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], DiscoveryController.prototype, "getRecap", null);
exports.DiscoveryController = DiscoveryController = __decorate([
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard),
    (0, common_1.Controller)('discovery'),
    __metadata("design:paramtypes", [discovery_service_1.DiscoveryService])
], DiscoveryController);
//# sourceMappingURL=discovery.controller.js.map