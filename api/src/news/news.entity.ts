import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { Localized } from '../database/localized.embeddable.js';

@Entity('news')
@Index(['publishedAt', 'id'])
export class News {
  @PrimaryGeneratedColumn('identity')
  id: number;

  @Column(() => Localized)
  title: Localized;

  @Column(() => Localized)
  body: Localized;

  @Column({ type: 'boolean', default: false })
  published: boolean;

  @Column({ type: 'date' })
  publishedAt: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
