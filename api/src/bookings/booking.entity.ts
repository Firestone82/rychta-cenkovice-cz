import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  type Relation,
  UpdateDateColumn,
} from 'typeorm';
import { ChannelConnection, type ChannelProvider } from '../channels/channel-connection.entity.js';
import { Message } from '../messages/message.entity.js';
import { User } from '../users/user.entity.js';
import { BookingUnit } from './booking-unit.entity.js';

export const BOOKING_KINDS = ['guest', 'block'] as const;
export type BookingKind = (typeof BOOKING_KINDS)[number];

export const BOOKING_STATUSES = ['pending', 'confirmed', 'cancelled'] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

/** Where the booking came from; a portal's name marks a block imported from its calendar. */
export type BookingSource = 'web' | 'admin' | ChannelProvider;

/** A stay of guests, or a block of dates the owner keeps free (`kind = 'block'`). */
@Entity('bookings')
@Index(['checkIn', 'checkOut'])
@Check('bookings_dates_check', `"check_out" > "check_in"`)
@Check('bookings_kind_check', `"kind" IN ('guest', 'block')`)
@Check('bookings_status_check', `"status" IN ('pending', 'confirmed', 'cancelled')`)
@Check(
  'bookings_source_check',
  `"source" IN ('web', 'admin', 'echalupy', 'booking', 'airbnb', 'other')`,
)
export class Booking {
  @PrimaryGeneratedColumn('identity')
  id: number;

  /** Short reference the guest can quote, e.g. `RC-7KQ2MX`. */
  @Column({ type: 'varchar', length: 12, unique: true })
  code: string;

  @Column({ type: 'varchar', length: 10 })
  kind: BookingKind;

  @Index()
  @Column({ type: 'varchar', length: 10 })
  status: BookingStatus;

  @Column({ type: 'varchar', length: 10 })
  source: BookingSource;

  @Column({ type: 'date' })
  checkIn: string;

  /** The day of departure, which is free for the next arrival. */
  @Column({ type: 'date' })
  checkOut: string;

  @Column({ type: 'int', default: 0 })
  guests: number;

  @Column({ type: 'varchar', length: 120, default: '' })
  name: string;

  @Column({ type: 'varchar', length: 254, default: '' })
  email: string;

  @Column({ type: 'varchar', length: 40, default: '' })
  phone: string;

  /** Written by the guest. */
  @Column({ type: 'text', default: '' })
  note: string;

  /** Written by the owner, never shown to the guest. */
  @Column({ type: 'text', default: '' })
  adminNote: string;

  /** In CZK; null means the price has not been agreed yet. */
  @Column({ type: 'int', nullable: true })
  totalPrice: number | null;

  @Column({ type: 'varchar', length: 2, default: 'cs' })
  language: string;

  /** The contact form message this booking was created from. */
  @Column({ type: 'int', nullable: true })
  messageId: number | null;

  @ManyToOne(() => Message, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'message_id' })
  message: Relation<Message> | null;

  @Column({ type: 'int', nullable: true })
  createdById: number | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'created_by_id' })
  createdBy: Relation<User> | null;

  /** Set on a block that mirrors a portal's calendar; such a block is changed only by the sync. */
  @Index()
  @Column({ type: 'int', nullable: true })
  channelConnectionId: number | null;

  @ManyToOne(() => ChannelConnection, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'channel_connection_id' })
  channelConnection: Relation<ChannelConnection> | null;

  @OneToMany(() => BookingUnit, (unit) => unit.booking)
  units: Relation<BookingUnit>[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
