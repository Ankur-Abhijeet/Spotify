import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { User } from './auth/entities/user.entity';
import { Playlist } from './library/entities/playlist.entity';
import { PlaylistTrack } from './library/entities/playlist-track.entity';
import { LibraryItem } from './library/entities/library-item.entity';
import { DiscoveryEvent } from './discovery/entities/discovery-event.entity';
import { UserEmbedding } from './discovery/entities/user-embedding.entity';
import { TrackFeature } from './discovery/entities/track-feature.entity';
import { PlaybackEvent } from './playback/entities/playback-event.entity';
import { Follow } from './social/entities/follow.entity';

export const getTypeOrmConfig = (): TypeOrmModuleOptions => {
  const dbUrl = process.env.DATABASE_URL;
  const isProduction = process.env.NODE_ENV === 'production';

  const entities = [
    User,
    Playlist,
    PlaylistTrack,
    LibraryItem,
    DiscoveryEvent,
    UserEmbedding,
    TrackFeature,
    PlaybackEvent,
    Follow,
  ];

  if (!dbUrl) {
    // Local fallback to SQLite so developers can get started with zero config
    return {
      type: 'better-sqlite3' as any,
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
    synchronize: true, // Auto-sync DB schema for MVP ease; migrate to explicit migrations post-MVP
    ssl: dbUrl.includes('localhost') ? false : { rejectUnauthorized: false },
    logging: !isProduction,
  };
};
