import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../auth/entities/user.entity';

@Entity('discovery_events')
export class DiscoveryEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column()
  sessionId: string;

  @CreateDateColumn()
  timestamp: Date;

  @Column({ type: 'simple-json', nullable: true })
  context: Record<string, any>;

  @Column()
  candidateAId: string;

  @Column()
  candidateBId: string;

  @Column({ nullable: true })
  chosenTrackId: string;

  @Column({ nullable: true })
  rejectedTrackId: string;

  @Column({ type: 'int', default: 0 })
  latencyMs: number;

  @Column({ type: 'simple-json', nullable: true })
  previewBehavior: Record<string, any>;

  @Column({ type: 'simple-json', nullable: true })
  downstreamEngagement: Record<string, any>;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;
}
