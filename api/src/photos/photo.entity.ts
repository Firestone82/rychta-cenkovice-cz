import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  type Relation,
} from 'typeorm';
import { Apartment } from '../apartments/apartment.entity.js';
import { Localized } from '../database/localized.embeddable.js';

@Entity('photos')
@Index(['category', 'sort', 'id'])
export class Photo {
  @PrimaryGeneratedColumn('identity')
  id: number;

  @Column({ type: 'varchar', length: 20 })
  category: string;

  @Index()
  @Column({ type: 'int', nullable: true })
  apartmentId: number | null;

  @ManyToOne(() => Apartment, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'apartment_id' })
  apartment: Relation<Apartment> | null;

  /** Path of the original on the old website; only photos taken over from it have one. */
  @Column({ type: 'varchar', length: 300, default: '' })
  sourcePath: string;

  /** Base name of the generated files (`<file>-<width>.jpg`); empty until the photo is imported. */
  @Column({ type: 'varchar', length: 16, default: '' })
  file: string;

  /** Size of the largest generated file. */
  @Column({ type: 'int', default: 0 })
  width: number;

  @Column({ type: 'int', default: 0 })
  height: number;

  @Column({ type: 'jsonb', default: () => `'[]'` })
  widths: number[];

  /** Average colour as `#rrggbb`, shown while the image loads. */
  @Column({ type: 'varchar', length: 7, default: '' })
  color: string;

  /** Data URI of a tiny blurred preview. */
  @Column({ type: 'text', default: '' })
  placeholder: string;

  @Column(() => Localized)
  alt: Localized;

  @Column({ type: 'int', default: 0 })
  sort: number;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
