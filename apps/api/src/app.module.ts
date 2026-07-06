import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { getTypeOrmConfig } from './database.config';
import { AuthModule } from './auth/auth.module';
import { CatalogModule } from './catalog/catalog.module';
import { LibraryModule } from './library/library.module';
import { PlaybackModule } from './playback/playback.module';
import { SearchModule } from './search/search.module';
import { DiscoveryModule } from './discovery/discovery.module';
import { SocialModule } from './social/social.module';
import { ConnectModule } from './connect/connect.module';

@Module({
  imports: [
    TypeOrmModule.forRoot(getTypeOrmConfig()),
    AuthModule,
    CatalogModule,
    LibraryModule,
    PlaybackModule,
    SearchModule,
    DiscoveryModule,
    SocialModule,
    ConnectModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
