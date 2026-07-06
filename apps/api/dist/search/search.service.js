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
exports.SearchService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const playlist_entity_1 = require("../library/entities/playlist.entity");
const catalog_service_1 = require("../catalog/catalog.service");
let SearchService = class SearchService {
    playlistRepository;
    catalogService;
    constructor(playlistRepository, catalogService) {
        this.playlistRepository = playlistRepository;
        this.catalogService = catalogService;
    }
    async search(query) {
        if (!query || query.trim() === '') {
            return { tracks: [], artists: [], albums: [], playlists: [] };
        }
        const cleanQuery = query.trim();
        try {
            const itunesRes = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(cleanQuery)}&media=music&limit=15`);
            let tracks = [];
            let artists = [];
            let albums = [];
            if (itunesRes.ok) {
                const data = await itunesRes.json();
                const results = data.results || [];
                const songResults = results.filter((item) => item.wrapperType === 'track');
                tracks = songResults.map((item) => this.catalogService.mapItunesTrack(item));
                artists = results
                    .filter((item) => item.artistName)
                    .map((art) => ({
                    id: art.artistId?.toString() || 'unknown-artist',
                    name: art.artistName,
                    imageUrl: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400',
                    popularity: 80,
                    bio: `Genre: ${art.primaryGenreName || 'Various'}`,
                }))
                    .filter((val, index, self) => self.findIndex((a) => a.id === val.id) === index);
                albums = results
                    .filter((item) => item.collectionName)
                    .map((alb) => {
                    const artworkUrl = alb.artworkUrl100
                        ? alb.artworkUrl100.replace('100x100bb.jpg', '400x400bb.jpg')
                        : 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=400';
                    return {
                        id: alb.collectionId?.toString() || 'unknown-album',
                        title: alb.collectionName,
                        artUrl: artworkUrl,
                        releaseDate: alb.releaseDate ? alb.releaseDate.substring(0, 4) : '2026',
                        artistId: alb.artistId?.toString() || 'unknown-artist',
                        artist: {
                            id: alb.artistId?.toString() || 'unknown-artist',
                            name: alb.artistName,
                        },
                    };
                })
                    .filter((val, index, self) => self.findIndex((a) => a.id === val.id) === index);
            }
            const playlists = await this.playlistRepository
                .createQueryBuilder('playlist')
                .where('playlist.title LIKE :query', { query: `%${cleanQuery}%` })
                .andWhere('playlist.isPublic = :isPublic', { isPublic: true })
                .take(10)
                .getMany();
            return { tracks, artists, albums, playlists };
        }
        catch (err) {
            console.error('Failed to proxy search query to iTunes:', err);
            return { tracks: [], artists: [], albums: [], playlists: [] };
        }
    }
};
exports.SearchService = SearchService;
exports.SearchService = SearchService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(playlist_entity_1.Playlist)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        catalog_service_1.CatalogService])
], SearchService);
//# sourceMappingURL=search.service.js.map