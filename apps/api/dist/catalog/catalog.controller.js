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
exports.CatalogController = void 0;
const common_1 = require("@nestjs/common");
const catalog_service_1 = require("./catalog.service");
let CatalogController = class CatalogController {
    catalogService;
    constructor(catalogService) {
        this.catalogService = catalogService;
    }
    async seed() {
        return this.catalogService.seed();
    }
    async getSpotifyToken() {
        try {
            const token = await this.catalogService.getSpotifyAccessToken();
            return { token };
        }
        catch (err) {
            console.error('getSpotifyToken ERROR:', err.stack || err);
            throw err;
        }
    }
    async getTracks() {
        return this.catalogService.getTracks();
    }
    async getPopular(limit) {
        const parsedLimit = limit ? parseInt(limit, 10) : 10;
        return this.catalogService.getPopularTracks(parsedLimit);
    }
    async getTrack(id) {
        return this.catalogService.getTrack(id);
    }
    async getAlbum(id) {
        return this.catalogService.getAlbum(id);
    }
    async getArtist(id) {
        return this.catalogService.getArtist(id);
    }
    async importSpotify(playlistId) {
        return this.catalogService.importSpotifyPlaylist(playlistId);
    }
};
exports.CatalogController = CatalogController;
__decorate([
    (0, common_1.Post)('seed'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], CatalogController.prototype, "seed", null);
__decorate([
    (0, common_1.Get)('spotify-token'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], CatalogController.prototype, "getSpotifyToken", null);
__decorate([
    (0, common_1.Get)('tracks'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], CatalogController.prototype, "getTracks", null);
__decorate([
    (0, common_1.Get)('popular'),
    __param(0, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], CatalogController.prototype, "getPopular", null);
__decorate([
    (0, common_1.Get)('tracks/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], CatalogController.prototype, "getTrack", null);
__decorate([
    (0, common_1.Get)('albums/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], CatalogController.prototype, "getAlbum", null);
__decorate([
    (0, common_1.Get)('artists/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], CatalogController.prototype, "getArtist", null);
__decorate([
    (0, common_1.Post)('import-spotify'),
    __param(0, (0, common_1.Body)('playlistId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], CatalogController.prototype, "importSpotify", null);
exports.CatalogController = CatalogController = __decorate([
    (0, common_1.Controller)('catalog'),
    __metadata("design:paramtypes", [catalog_service_1.CatalogService])
], CatalogController);
//# sourceMappingURL=catalog.controller.js.map