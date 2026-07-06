import { Entity, Column, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity('track_features')
export class TrackFeature {
  @PrimaryColumn()
  trackId: string;

  @Column({ type: 'simple-json' })
  features: number[];

  @UpdateDateColumn()
  updatedAt: Date;
}
