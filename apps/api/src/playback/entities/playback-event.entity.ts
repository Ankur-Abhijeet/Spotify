import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../auth/entities/user.entity';

@Entity('playback_events')
export class PlaybackEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column()
  trackId: string;

  @Column({ type: 'varchar', length: 20 })
  eventType: 'play' | 'skip' | 'save' | 'finish';

  @CreateDateColumn()
  timestamp: Date;

  @Column({ type: 'simple-json', nullable: true })
  metadata: Record<string, any>;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;
}
