import { Artist } from './artist.entity';
import { Album } from './album.entity';

export class Track {
  id: string;
  title: string;
  duration: number; // in seconds
  audioUrl: string;
  popularity?: number;
  streamable?: boolean;
  artistId?: string;
  albumId?: string;
  artist?: Artist;
  album?: Album;
}
