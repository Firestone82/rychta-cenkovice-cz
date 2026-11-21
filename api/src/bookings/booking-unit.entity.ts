import { Entity, Index, JoinColumn, ManyToOne, PrimaryColumn, type Relation } from 'typeorm';
import { Apartment } from '../apartments/apartment.entity.js';
import { Booking } from './booking.entity.js';

/** One apartment taken by a booking. */
@Entity('booking_units')
export class BookingUnit {
  @PrimaryColumn({ type: 'int' })
  bookingId: number;

  @Index()
  @PrimaryColumn({ type: 'int' })
  apartmentId: number;

  @ManyToOne(() => Booking, (booking) => booking.units, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'booking_id' })
  booking: Relation<Booking>;

  @ManyToOne(() => Apartment, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'apartment_id' })
  apartment: Relation<Apartment>;
}
