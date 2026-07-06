import { Artist } from './artist.entity';
import { Album } from './album.entity';
export declare class Track {
    id: string;
    title: string;
    duration: number;
    audioUrl: string;
    popularity?: number;
    streamable?: boolean;
    artistId?: string;
    albumId?: string;
    artist?: Artist;
    album?: Album;
}
