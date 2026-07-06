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
exports.SocialController = void 0;
const common_1 = require("@nestjs/common");
const social_service_1 = require("./social.service");
const auth_guard_1 = require("../auth/auth.guard");
let SocialController = class SocialController {
    socialService;
    constructor(socialService) {
        this.socialService = socialService;
    }
    async followUser(req, followeeId) {
        return this.socialService.followUser(req.user.sub, followeeId);
    }
    async unfollowUser(req, followeeId) {
        return this.socialService.unfollowUser(req.user.sub, followeeId);
    }
    async getFollowing(req) {
        return this.socialService.getFollowing(req.user.sub);
    }
    async getFriendActivity(req) {
        return this.socialService.getFriendActivity(req.user.sub);
    }
    async generateBlend(req, friendId) {
        return this.socialService.generateBlend(req.user.sub, friendId);
    }
};
exports.SocialController = SocialController;
__decorate([
    (0, common_1.Post)('follow'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)('followeeId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], SocialController.prototype, "followUser", null);
__decorate([
    (0, common_1.Delete)('unfollow'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)('followeeId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], SocialController.prototype, "unfollowUser", null);
__decorate([
    (0, common_1.Get)('following'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SocialController.prototype, "getFollowing", null);
__decorate([
    (0, common_1.Get)('friend-activity'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SocialController.prototype, "getFriendActivity", null);
__decorate([
    (0, common_1.Post)('blend/generate'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)('friendId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], SocialController.prototype, "generateBlend", null);
exports.SocialController = SocialController = __decorate([
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard),
    (0, common_1.Controller)('social'),
    __metadata("design:paramtypes", [social_service_1.SocialService])
], SocialController);
//# sourceMappingURL=social.controller.js.map