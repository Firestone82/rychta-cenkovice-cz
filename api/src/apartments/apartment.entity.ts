import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { Localized, LocalizedList } from '../database/localized.embeddable.js';

@Entity('apartments')
export class Apartment {
  @PrimaryGeneratedColumn('identity')
  id: number;

  @Column({ type: 'varchar', length: 80, unique: true })
  slug: string;

  @Column({ type: 'int' })
  number: number;

  @Column({ type: 'int' })
  floor: number;

  /** Floor area in square metres. */
  @Column({ type: 'int' })
  area: number;

  @Column({ type: 'int' })
  beds: number;

  @Column({ type: 'int', default: 0 })
  extraBeds: number;

  @Column({ type: 'boolean', default: false })
  accessible: boolean;

  /** One of `FLAT_TYPES`, or empty when unknown. */
  @Column({ type: 'varchar', length: 20, default: '' })
  flatType: string;

  /** Keys from `AMENITIES`, in that list's order. */
  @Column({ type: 'jsonb', default: () => `'[]'` })
  amenities: string[];

  /** Free tags shown on the apartment, such as "Can be connected". */
  @Column({ type: 'jsonb', default: () => `'[]'` })
  labels: { cs: string; en: string }[];

  @Column(() => Localized)
  layout: Localized;

  @Column(() => LocalizedList)
  features: LocalizedList;

  @Column(() => Localized)
  note: Localized;

  @Column(() => Localized)
  description: Localized;

  /** In CZK; null means "price on request". */
  @Column({ type: 'int', nullable: true })
  pricePerNight: number | null;

  @Column({ type: 'int', default: 2 })
  minNights: number;

  @Column({ type: 'boolean', default: true })
  active: boolean;

  @Column({ type: 'int', default: 0 })
  sort: number;
}
