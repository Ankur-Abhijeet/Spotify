"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTypeOrmConfig = void 0;
const user_entity_1 = require("./auth/entities/user.entity");
const playlist_entity_1 = require("./library/entities/playlist.entity");
const playlist_track_entity_1 = require("./library/entities/playlist-track.entity");
const library_item_entity_1 = require("./library/entities/library-item.entity");
const discovery_event_entity_1 = require("./discovery/entities/discovery-event.entity");
const user_embedding_entity_1 = require("./discovery/entities/user-embedding.entity");
const track_feature_entity_1 = require("./discovery/entities/track-feature.entity");
const playback_event_entity_1 = require("./playback/entities/playback-event.entity");
const follow_entity_1 = require("./social/entities/follow.entity");
const getTypeOrmConfig = () => {
    const dbUrl = process.env.DATABASE_URL;
    const isProduction = process.env.NODE_ENV === 'production';
    const entities = [
        user_entity_1.User,
        playlist_entity_1.Playlist,
        playlist_track_entity_1.PlaylistTrack,
        library_item_entity_1.LibraryItem,
        discovery_event_entity_1.DiscoveryEvent,
        user_embedding_entity_1.UserEmbedding,
        track_feature_entity_1.TrackFeature,
        playback_event_entity_1.PlaybackEvent,
        follow_entity_1.Follow,
    ];
    if (!dbUrl) {
        return {
            type: 'better-sqlite3',
            database: 'db.sqlite',
            entities,
            synchronize: true,
            logging: !isProduction,
        };
    }
    return {
        type: 'postgres',
        url: dbUrl,
        entities,
        synchronize: true,
        ssl: dbUrl.includes('localhost') ? false : { rejectUnauthorized: false },
        logging: !isProduction,
    };
};
exports.getTypeOrmConfig = getTypeOrmConfig;
//# sourceMappingURL=database.config.js.map