import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Playlist } from './entities/playlist.entity';
import { PlaylistTrack } from './entities/playlist-track.entity';
import { LibraryItem } from './entities/library-item.entity';
import { LibraryService } from './library.service';
import { LibraryController } from './library.controller';
import { AuthModule } from '../auth/auth.module';
import { CatalogModule } from '../catalog/catalog.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Playlist, PlaylistTrack, LibraryItem]),
    AuthModule,
    CatalogModule,
  ],
  controllers: [LibraryController],
  providers: [LibraryService],
  exports: [LibraryService, TypeOrmModule],
})
export class LibraryModule {}
