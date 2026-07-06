import { Album } from './album.entity';
import { Track } from './track.entity';

export class Artist {
  id: string;
  name: string;
  bio?: string;
  imageUrl?: string;
  popularity?: number;
  albums?: Album[];
  tracks?: Track[];
}
