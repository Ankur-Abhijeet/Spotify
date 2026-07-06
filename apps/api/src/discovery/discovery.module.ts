import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DiscoveryEvent } from './entities/discovery-event.entity';
import { UserEmbedding } from './entities/user-embedding.entity';
import { TrackFeature } from './entities/track-feature.entity';
import { DiscoveryService } from './discovery.service';
import { DiscoveryController } from './discovery.controller';
import { CohortHelper } from './cohort.helper';
import { Playlist } from '../library/entities/playlist.entity';
import { PlaylistTrack } from '../library/entities/playlist-track.entity';
import { AuthModule } from '../auth/auth.module';
import { CatalogModule } from '../catalog/catalog.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      DiscoveryEvent,
      UserEmbedding,
      TrackFeature,
      Playlist,
      PlaylistTrack,
    ]),
    AuthModule,
    CatalogModule,
  ],
  controllers: [DiscoveryController],
  providers: [DiscoveryService, CohortHelper],
  exports: [DiscoveryService, CohortHelper, TypeOrmModule],
})
export class DiscoveryModule {}
