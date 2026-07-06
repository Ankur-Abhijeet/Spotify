import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  PrimaryColumn,
  CreateDateColumn,
} from 'typeorm';
import { Playlist } from './playlist.entity';

@Entity('playlist_tracks')
export class PlaylistTrack {
  @PrimaryColumn()
  playlistId: string;

  @PrimaryColumn()
  trackId: string;

  @Column({ type: 'int' })
  position: number;

  @CreateDateColumn()
  addedAt: Date;

  @ManyToOne(() => Playlist, (playlist) => playlist.playlistTracks, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'playlistId' })
  playlist: Playlist;
}
