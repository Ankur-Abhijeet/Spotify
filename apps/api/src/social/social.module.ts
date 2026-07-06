import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Follow } from './entities/follow.entity';
import { SocialService } from './social.service';
import { SocialController } from './social.controller';
import { AuthModule } from '../auth/auth.module';
import { CatalogModule } from '../catalog/catalog.module';
import { LibraryModule } from '../library/library.module';
import { PlaybackEvent } from '../playback/entities/playback-event.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Follow, PlaybackEvent]),
    AuthModule,
    CatalogModule,
    LibraryModule,
  ],
  controllers: [SocialController],
  providers: [SocialService],
  exports: [SocialService, TypeOrmModule],
})
export class SocialModule {}
