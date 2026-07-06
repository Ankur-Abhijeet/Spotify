import { Album } from './album.entity';
import { Track } from './track.entity';
export declare class Artist {
    id: string;
    name: string;
    bio?: string;
    imageUrl?: string;
    popularity?: number;
    albums?: Album[];
    tracks?: Track[];
}
