"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var CatalogService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CatalogService = void 0;
const common_1 = require("@nestjs/common");
let CatalogService = CatalogService_1 = class CatalogService {
    logger = new common_1.Logger(CatalogService_1.name);
    async getSpotifyAccessToken() {
        const clientId = process.env.SPOTIFY_CLIENT_ID;
        const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
        if (!clientId || !clientSecret) {
            throw new Error('Spotify developer credentials are not configured in environment (SPOTIFY_CLIENT_ID / SPOTIFY_CLIENT_SECRET)');
        }
        try {
            const authHeader = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
            const res = await fetch('https://accounts.spotify.com/api/token', {
                method: 'POST',
                headers: {
                    Authorization: `Basic ${authHeader}`,
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: 'grant_type=client_credentials',
            });
            if (!res.ok) {
                throw new Error(`Spotify accounts token fetch rejected: ${res.statusText}`);
            }
            const data = await res.json();
            return data.access_token;
        }
        catch (err) {
            this.logger.error('Failed to retrieve Spotify access token', err.stack);
            throw err;
        }
    }
    mapItunesTrack(item) {
        const artworkUrl = item.artworkUrl100
            ? item.artworkUrl100.replace('100x100bb.jpg', '400x400bb.jpg')
            : 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=400';
        return {
            id: item.trackId ? item.trackId.toString() : 'unknown-track',
            title: item.trackName || 'Unknown Track',
            duration: Math.round((item.trackTimeMillis || 180000) / 1000),
            audioUrl: item.previewUrl || 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
            popularity: 80,
            streamable: true,
            artistId: item.artistId ? item.artistId.toString() : 'unknown-artist',
            albumId: item.collectionId ? item.collectionId.toString() : 'unknown-album',
            artist: {
                id: item.artistId ? item.artistId.toString() : 'unknown-artist',
                name: item.artistName || 'Unknown Artist',
                bio: `Genre: ${item.primaryGenreName || 'Various'}`,
                imageUrl: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400',
            },
            album: {
                id: item.collectionId ? item.collectionId.toString() : 'unknown-album',
                title: item.collectionName || 'Unknown Album',
                artUrl: artworkUrl,
                releaseDate: item.releaseDate ? item.releaseDate.substring(0, 4) : '2026',
            },
        };
    }
    mapSpotifyTrack(t) {
        return this.mapItunesTrack(t);
    }
    async seed() {
        return {
            status: 'success',
            message: 'Zero-storage architecture active: No seeding required, fetching directly from iTunes API!',
        };
    }
    async getTracks() {
        try {
            const res = await fetch('https://itunes.apple.com/search?term=lofi&media=music&limit=20');
            if (!res.ok)
                return [];
            const data = await res.json();
            const items = data.results || [];
            return items.filter((item) => item.wrapperType === 'track').map((item) => this.mapItunesTrack(item));
        }
        catch (err) {
            this.logger.error('Failed to get tracks from iTunes', err.stack);
            return [];
        }
    }
    async getPopularTracks(limit = 10) {
        try {
            const res = await fetch(`https://itunes.apple.com/search?term=pop&media=music&limit=${limit}`);
            if (!res.ok)
                return [];
            const data = await res.json();
            const items = data.results || [];
            return items.filter((item) => item.wrapperType === 'track').map((item) => this.mapItunesTrack(item));
        }
        catch (err) {
            this.logger.error('Failed to get popular tracks from iTunes', err.stack);
            return [];
        }
    }
    async getTrack(id) {
        const res = await fetch(`https://itunes.apple.com/lookup?id=${id}`);
        if (!res.ok) {
            throw new Error(`Track with ID ${id} not found on iTunes`);
        }
        const data = await res.json();
        const item = data.results?.[0];
        if (!item) {
            throw new Error(`Track with ID ${id} not found on iTunes`);
        }
        return this.mapItunesTrack(item);
    }
    async getAlbum(id) {
        const res = await fetch(`https://itunes.apple.com/lookup?id=${id}&entity=song`);
        if (!res.ok) {
            throw new Error(`Album with ID ${id} not found on iTunes`);
        }
        const data = await res.json();
        const items = data.results || [];
        const collection = items.find((item) => item.wrapperType === 'collection');
        if (!collection) {
            throw new Error(`Album with ID ${id} not found on iTunes`);
        }
        const songs = items.filter((item) => item.wrapperType === 'track');
        const mappedTracks = songs.map((t) => ({
            id: t.trackId.toString(),
            title: t.trackName,
            duration: Math.round((t.trackTimeMillis || 180000) / 1000),
            audioUrl: t.previewUrl || 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
            popularity: 80,
            streamable: true,
            artistId: t.artistId ? t.artistId.toString() : 'unknown',
            albumId: collection.collectionId.toString(),
        }));
        const artworkUrl = collection.artworkUrl100
            ? collection.artworkUrl100.replace('100x100bb.jpg', '400x400bb.jpg')
            : 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=400';
        return {
            id: collection.collectionId.toString(),
            title: collection.collectionName,
            releaseDate: collection.releaseDate ? collection.releaseDate.substring(0, 4) : '2026',
            artUrl: artworkUrl,
            artistId: collection.artistId ? collection.artistId.toString() : 'unknown',
            artist: {
                id: collection.artistId ? collection.artistId.toString() : 'unknown',
                name: collection.artistName || 'Unknown Artist',
            },
            tracks: mappedTracks,
        };
    }
    async getArtist(id) {
        const res = await fetch(`https://itunes.apple.com/lookup?id=${id}&entity=song&limit=10`);
        if (!res.ok) {
            throw new Error(`Artist with ID ${id} not found on iTunes`);
        }
        const data = await res.json();
        const items = data.results || [];
        const artist = items.find((item) => item.wrapperType === 'artist');
        if (!artist) {
            throw new Error(`Artist with ID ${id} not found on iTunes`);
        }
        const songs = items.filter((item) => item.wrapperType === 'track');
        const mappedTracks = songs.map((t) => this.mapItunesTrack(t));
        return {
            id: artist.artistId.toString(),
            name: artist.artistName,
            bio: `Genre: ${artist.primaryGenreName || 'Various'}`,
            imageUrl: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400',
            popularity: 80,
            tracks: mappedTracks,
            albums: [],
        };
    }
    async getTracksByIds(ids) {
        if (!ids || ids.length === 0)
            return [];
        try {
            const res = await fetch(`https://itunes.apple.com/lookup?id=${ids.join(',')}`);
            if (!res.ok)
                return [];
            const data = await res.json();
            const items = data.results || [];
            return items.filter((item) => item.wrapperType === 'track').map((item) => this.mapItunesTrack(item));
        }
        catch (err) {
            this.logger.error('Failed to lookup tracks by IDs from iTunes', err.stack);
            return [];
        }
    }
    async importSpotifyPlaylist(playlistId) {
        try {
            const tracks = await this.getTracks();
            return {
                status: 'success',
                tracks,
                message: `Successfully loaded ${tracks.length} iTunes mock tracks for imported playlist ${playlistId}`,
            };
        }
        catch (err) {
            throw new Error(`Failed to import iTunes playlist: ${err.message}`);
        }
    }
};
exports.CatalogService = CatalogService;
exports.CatalogService = CatalogService = CatalogService_1 = __decorate([
    (0, common_1.Injectable)()
], CatalogService);
//# sourceMappingURL=catalog.service.js.map