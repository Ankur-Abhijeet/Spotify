import { Entity, Column, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity('user_embeddings')
export class UserEmbedding {
  @PrimaryColumn()
  userId: string;

  @Column({ type: 'simple-json' })
  embedding: number[];

  @UpdateDateColumn()
  updatedAt: Date;
}
