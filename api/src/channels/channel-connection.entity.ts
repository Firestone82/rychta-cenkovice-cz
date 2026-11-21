import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  type Relation,
  Unique,
} from 'typeorm';
import { Apartment } from '../apartments/apartment.entity.js';

/** Portals whose calendar can be read. The value is also the `source` of the imported blocks. */
export const CHANNEL_PROVIDERS = ['echalupy', 'booking', 'airbnb', 'other'] as const;
export type ChannelProvider = (typeof CHANNEL_PROVIDERS)[number];

/** The calendar of one apartment on a booking portal, read as an iCal feed. */
@Entity('channel_connections')
@Unique(['apartmentId', 'provider'])
@Check(
  'channel_connections_provider_check',
  `"provider" IN ('echalupy', 'booking', 'airbnb', 'other')`,
)
export class ChannelConnection {
  @PrimaryGeneratedColumn('identity')
  id: number;

  @Column({ type: 'int' })
  apartmentId: number;

  @ManyToOne(() => Apartment, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'apartment_id' })
  apartment: Relation<Apartment>;

  @Column({ type: 'varchar', length: 10 })
  provider: ChannelProvider;

  /** Carries a private token of the portal: shown to administrators only and never logged. */
  @Column({ type: 'text' })
  importUrl: string;

  /** The last attempt to read the feed; null before the first one. */
  @Column({ type: 'timestamptz', nullable: true })
  syncedAt: Date | null;

  /** Why the last attempt failed, as a code the administration translates; empty after a success. */
  @Column({ type: 'varchar', length: 20, default: '' })
  lastError: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
