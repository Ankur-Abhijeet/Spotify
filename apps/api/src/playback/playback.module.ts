import { Module } from '@nestjs/common';
import { PlaybackService } from './playback.service';
import { PlaybackController } from './playback.controller';
import { CatalogModule } from '../catalog/catalog.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [CatalogModule, AuthModule],
  controllers: [PlaybackController],
  providers: [PlaybackService],
  exports: [PlaybackService],
})
export class PlaybackModule {}
