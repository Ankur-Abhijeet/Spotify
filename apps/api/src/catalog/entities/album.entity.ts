import { Artist } from './artist.entity';
import { Track } from './track.entity';

export class Album {
  id: string;
  title: string;
  releaseDate?: string;
  artUrl?: string;
  artistId?: string;
  artist?: Artist;
  tracks?: Track[];
}
